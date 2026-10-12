export class AudioCache {
  #audioContext;
  #fetchUrl;
  #audioBufferPromiseMap = new Map();

  constructor(options = {}) {
    const {
      audioContext = new AudioContext(),
      fetchUrl = "/audio/api/load-audio-data",
    } = options;

    this.#audioContext = audioContext;
    this.#fetchUrl = fetchUrl;
  }

  async getAudioBuffer(audioPath) {
    let promise = this.#audioBufferPromiseMap.get(audioPath);

    if (!promise) {
      promise = this.#loadAudioBuffer(audioPath);
      this.#audioBufferPromiseMap.set(audioPath, promise);

      try {
        await promise;
      } catch (error) {
        this.#audioBufferPromiseMap.delete(audioPath);
        throw error;
      }
    }

    return promise;
  }

  async #loadAudioBuffer(audioPath) {
    const url = new URL(this.#fetchUrl, window.location.origin);
    url.searchParams.set("audioPath", audioPath);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to load audio: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    return await this.#audioContext.decodeAudioData(arrayBuffer);
  }
}
