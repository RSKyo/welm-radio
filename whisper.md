# Whisper / whisper.cpp 安装与使用记录

本文记录 `welm-radio` 项目中用于“音频转文字”的本地方案：`whisper.cpp + large-v3 模型`。

---

## 1. Whisper 是什么

Whisper 是 OpenAI 开源的语音识别模型，用于把音频或视频中的人声转成文字。

它不是一个单一 App，可以理解为三层：

```txt
1. 模型
   真正负责识别语音的 AI 模型。

2. 模型文件
   tiny / base / small / medium / large 等不同大小。
   越大通常越准，但越慢、越占空间。

3. 运行程序
   加载模型、读取音频、输出文字。
```

官方 Whisper 是 Python 项目。当前更推荐使用 `whisper.cpp`，因为它更适合本地命令行运行，也更适合以后被 Node.js 调用。

---

## 2. 为什么选择 whisper.cpp

`whisper.cpp` 是 Whisper 的 C/C++ 实现。

优点：

```txt
本地运行
免费使用
命令行友好
适合 macOS
适合 Apple Silicon
适合被 Node.js spawn / execFile 调用
```

对 `welm-radio` 的目标流程：

```txt
音频文件
  ↓
whisper-cli 转写
  ↓
生成文本
  ↓
写入 xxx.meta.json 的 content 字段
```

---

## 3. 模型大小参考

常见模型大小大致如下：

```txt
tiny     约 75 MB
base     约 142 MB
small    约 466 MB
medium   约 1.5 GB
large    约 2.9 GB ~ 3 GB
```

当前计划使用：

```txt
ggml-large-v3.bin
```

原因：优先追求中文 / 英文转写质量。

---

## 4. 安装 whisper.cpp

使用 Homebrew 安装：

```bash
brew install whisper-cpp
```

安装完成后，Homebrew 公式名叫 `whisper-cpp`，但实际命令不是 `whisper-cpp`，而是：

```bash
whisper-cli
```

检查安装内容：

```bash
brew list whisper-cpp
```

当前机器安装后包含：

```txt
/opt/homebrew/Cellar/whisper-cpp/1.9.1/bin/whisper-cli
/opt/homebrew/Cellar/whisper-cpp/1.9.1/bin/whisper-server
/opt/homebrew/Cellar/whisper-cpp/1.9.1/bin/whisper-bench
...
```

确认命令可用：

```bash
which whisper-cli
whisper-cli --help
```

当前确认：

```txt
/opt/homebrew/bin/whisper-cli
```

`whisper-cli --help` 中显示支持音频格式：

```txt
flac, mp3, ogg, wav
```

---

## 5. 模型存放位置

决定把模型放到 `welm-radio` 同级目录：

```txt
/Users/zzz/GitHub/
├── welm-cdp/
├── welm-radio/
└── whisper/
    └── models/
        └── ggml-large-v3.bin
```

创建目录：

```bash
cd /Users/zzz/GitHub
mkdir -p whisper/models
cd whisper/models
```

确认位置：

```bash
pwd
```

应输出：

```txt
/Users/zzz/GitHub/whisper/models
```

---

## 6. 下载 large-v3 模型

官方模型说明：

```txt
https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md
```

模型有很多：

```txt
tiny  tiny.en  tiny-q5_1  tiny-q8_0
base  base.en  base-q5_1  base-q8_0
small  small.en  small.en-tdrz  small-q5_1  small-q8_0
medium  medium.en  medium-q5_0  medium-q8_0
large-v1  large-v2  large-v2-q5_0  large-v3
large-v3-q5_0  large-v3-turbo
large-v3-turbo-q5_0  large-v3-turbo-q8_0
```

目前只关注这些就够了：

```txt
small
medium
large-v3
large-v3-turbo
```

模型文件名有固定规律：

```txt
模型名 medium     → ggml-medium.bin
模型名 large-v3   → ggml-large-v3.bin
```

.en 表示仅英语；你的音频可能有中文或其他语言，选不带 .en 的模型。

Hugging Face 是一个专门服务于 AI 的网站和平台，可以把它理解成：
AI 模型领域的 GitHub + 模型下载站 + 在线体验站。

官方 Hugging Face 地址：

```txt
https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin
```

国内访问 Hugging Face 可能不稳定，可以使用镜像：

```txt
https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin
```

推荐下载命令：

```bash
平时默认、批量转录
curl -L -C - -o ggml-large-v3-turbo-q5_0.bin \
  https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin

同一段音频用 q5 识别明显不理想，机器内存充足
curl -L -C - -o ggml-large-v3-turbo-q8_0.bin \
  https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q8_0.bin

特别重要的最终字幕；中文人声很轻、发音模糊、背景音乐很重
curl -L -C - -o ggml-large-v3.bin \
  https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin

机器较慢、只是粗略判断音频内容
curl -L -C - -o ggml-medium.bin \
  https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin

未量化，1.5 GiB；通常没必要特意选它。
curl -L -C - -o ggml-large-v3-turbo.bin \
  https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

参数说明：

```txt
-L      跟随重定向
-C -    断点续传
-o      输出文件名
```

如果下载中断，重新执行同一条命令即可继续。

如果镜像没有数据，改为官方下载：

```bash
curl -L -C - -o ggml-large-v3.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin
```

下载完成后检查：

```bash
ls -lh /Users/zzz/GitHub/whisper/models/ggml-large-v3.bin
```

预期大小：约 3GB。

---

## 7. 基本转写命令

假设测试音频是：

```txt
/Users/zzz/Downloads/test.mp3
```

中文音频：

```bash
whisper-cli \
  -m /Users/zzz/GitHub/whisper/models/ggml-large-v3.bin \
  -f /Users/zzz/Downloads/test.mp3 \
  -l zh
```

英文音频：

```bash
whisper-cli \
  -m /Users/zzz/GitHub/whisper/models/ggml-large-v3.bin \
  -f /Users/zzz/Downloads/test.mp3 \
  -l en
```

自动识别语言：

```bash
whisper-cli \
  -m /Users/zzz/GitHub/whisper/models/ggml-large-v3.bin \
  -f /Users/zzz/Downloads/test.mp3 \
  -l auto
```

---

## 8. 输出 txt 文件

以后要写入 `meta.content`，所以需要生成文本文件。

创建输出目录：

```bash
mkdir -p /Users/zzz/GitHub/whisper/output
```

输出 `.txt`：

```bash
whisper-cli \
  -m /Users/zzz/GitHub/whisper/models/ggml-large-v3.bin \
  -f /Users/zzz/Downloads/test.mp3 \
  -l zh \
  -otxt \
  -of /Users/zzz/GitHub/whisper/output/test
```

查看结果：

```bash
cat /Users/zzz/GitHub/whisper/output/test.txt
```

注意：

```txt
-of 写的是输出文件前缀，不带扩展名。
-otxt 会自动生成 .txt 文件。
```

---

## 9. 常用参数

```txt
-m      模型路径
-f      输入音频文件路径
-l      语言，zh / en / auto
-otxt   输出 txt 文件
-of     输出文件前缀，不带扩展名
-oj     输出 JSON 文件
-osrt   输出 SRT 字幕文件
-ovtt   输出 VTT 字幕文件
-nt     不输出时间戳
-np     除结果外不打印其他内容
-ng     禁用 GPU
-t      设置线程数
```

示例：只输出纯文本，并减少控制台杂项输出：

```bash
whisper-cli \
  -m /Users/zzz/GitHub/whisper/models/ggml-large-v3.bin \
  -f /Users/zzz/Downloads/test.mp3 \
  -l zh \
  -otxt \
  -nt \
  -of /Users/zzz/GitHub/whisper/output/test
```

---

## 10. 如果音频格式有问题

当前 `whisper-cli --help` 显示支持：

```txt
flac, mp3, ogg, wav
```

如果某些音频无法识别，可以用 `ffmpeg` 转成单声道 16k WAV。

安装 ffmpeg：

```bash
brew install ffmpeg
```

转换：

```bash
ffmpeg -i /Users/zzz/Downloads/test.mp3 \
  -ar 16000 \
  -ac 1 \
  /Users/zzz/Downloads/test.wav
```

再转写：

```bash
whisper-cli \
  -m /Users/zzz/GitHub/whisper/models/ggml-large-v3.bin \
  -f /Users/zzz/Downloads/test.wav \
  -l zh \
  -otxt \
  -of /Users/zzz/GitHub/whisper/output/test
```

---

## 11. 和 welm-radio 的关系

当前 `meta.content` 字段定位为：

```txt
音频正文 / 转写文本 / 内容原文
```

未来流程可以是：

```txt
选择音频文件
  ↓
调用 whisper-cli
  ↓
读取输出 txt
  ↓
写入 meta.content
```

未来可能封装成 Node 方法：

```js
async function transcribeAudio(filePath, options = {}) {
  // 调用 whisper-cli
  // 返回转写文本
}
```

然后：

```js
const content = await transcribeAudio(filePath);

saveMeta(metaPath, {
  content,
});
```

模型路径以后可以写入配置：

```json
{
  "whisper": {
    "model": "/Users/zzz/GitHub/whisper/models/ggml-large-v3.bin"
  }
}
```

---

## 12. 当前已确认信息

已安装：

```txt
whisper-cpp 1.9.1
```

实际命令：

```txt
whisper-cli
```

命令路径：

```txt
/opt/homebrew/bin/whisper-cli
```

本机后端输出中可见：

```txt
Apple M2
Metal backend loaded
CPU backend loaded
```

说明当前机器可以使用 whisper.cpp 的本地后端运行。

---

## 13. 下一步

1. 下载模型：

```bash
cd /Users/zzz/GitHub
mkdir -p whisper/models
cd whisper/models

curl -L -C - -o ggml-large-v3.bin \
  https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin
```

2. 检查模型：

```bash
ls -lh /Users/zzz/GitHub/whisper/models/ggml-large-v3.bin
```

3. 找一个短音频测试：

```bash
whisper-cli \
  -m /Users/zzz/GitHub/whisper/models/ggml-large-v3.bin \
  -f /Users/zzz/Downloads/test.mp3 \
  -l zh \
  -otxt \
  -of /Users/zzz/GitHub/whisper/output/test
```

