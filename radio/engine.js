/**
 * welm-radio Broadcast Engine v0.2
 *
 * 职责：
 * 1. 只消费数据（不生成）
 * 2. 维护运行态（current / next）
 * 3. 决定下一节点（graph traversal）
 * 4. 提供 schedule 能力（可扩展）
 */

export class BroadcastEngine {
  constructor({ mediaRegistry, broadcastGraph, selector }) {
    // ✔ 外部注入（关键：engine不拥有数据）
    this.mediaRegistry = mediaRegistry;
    this.graph = new Map();
    this.selector = selector;

    broadcastGraph.forEach(node => {
      this.graph.set(node.id, node);
    });

    // runtime state
    this.currentNode = null;
    this.currentMedia = null;

    this.currentSource = null;
    this.nextSource = null;
  }

  /**
   * 启动播放
   */
  start(startNodeId) {
    this.currentNode = this.graph.get(startNodeId);
    return this.playCurrent();
  }

  /**
   * 核心：播放当前节点
   */
  playCurrent() {
    if (!this.currentNode) return null;

    const media = this.resolveMedia(this.currentNode);
    this.currentMedia = media;

    this.emit("play", {
      node: this.currentNode,
      media
    });

    return media;
  }

  /**
   * 核心：获取下一个节点（调度逻辑）
   */
  getNext() {
    if (!this.currentNode) return null;

    const node = this.currentNode;

    // 1. graph edges 优先
    if (node.edges?.length) {
      const nextId = this.resolveEdge(node.edges);
      this.currentNode = this.graph.get(nextId);
      return this.currentNode;
    }

    // 2. fallback：selector（tags）
    const candidates = this.selector.match(
      node.selector?.tags || [],
      this.mediaRegistry
    );

    const picked = this.selector.pick(candidates);

    // media → node 包装（runtime node）
    this.currentNode = this.wrapMediaAsNode(picked);

    return this.currentNode;
  }

  /**
   * edge 权重选择
   */
  resolveEdge(edges) {
    const total = edges.reduce((s, e) => s + (e.weight || 1), 0);

    let r = Math.random() * total;

    for (const e of edges) {
      r -= (e.weight || 1);
      if (r <= 0) return e.to;
    }

    return edges[0].to;
  }

  /**
   * media registry → 实际播放媒体
   */
  resolveMedia(node) {
    if (!node) return null;

    // node 直接绑定 mediaId
    if (node.mediaId) {
      return this.mediaRegistry.find(m => m.id === node.mediaId);
    }

    // tag selector 模式
    const candidates = this.selector.match(
      node.selector?.tags || [],
      this.mediaRegistry
    );

    return this.selector.pick(candidates);
  }

  /**
   * 将 media 包装成 runtime node（fallback）
   */
  wrapMediaAsNode(media) {
    if (!media) return null;

    return {
      id: `runtime_${media.id}`,
      mediaId: media.id,
      type: media.type,
      selector: media.tags ? { tags: media.tags } : {}
    };
  }

  /**
   * step：推进播放（核心调度入口）
   */
  step() {
    const nextNode = this.getNext();

    if (!nextNode) return null;

    const media = this.resolveMedia(nextNode);

    this.emit("next", {
      node: nextNode,
      media
    });

    this.currentNode = nextNode;
    this.currentMedia = media;

    return media;
  }

  /**
   * 预测播放长度（v0.1 简化版）
   */
  estimateDuration(startNodeId, steps = 20) {
    let node = this.graph.get(startNodeId);
    let total = 0;

    for (let i = 0; i < steps; i++) {
      if (!node) break;

      const media = this.resolveMedia(node);
      total += media?.duration || node.duration || 30;

      node = this.simulateNext(node);
    }

    return total;
  }

  simulateNext(node) {
    if (!node) return null;

    if (node.edges?.length) {
      const id = this.resolveEdge(node.edges);
      return this.graph.get(id);
    }

    const candidates = this.selector.match(
      node.selector?.tags || [],
      this.mediaRegistry
    );

    return this.selector.pick(candidates);
  }

  /**
   * 事件系统（给 player 用）
   */
  emit(event, payload) {
    this.onEvent?.(event, payload);
  }

  on(eventHandler) {
    this.onEvent = eventHandler;
  }
}