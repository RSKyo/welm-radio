# Clipboard 模块说明

本目录用于封装系统剪贴板能力。当前按剪贴板数据类型分为三类：文本、文件引用、图片内容。

```txt
clipboard/
  text.js                  # 文本剪贴板
  file.js                  # 文件引用剪贴板
  image.js                 # 图片内容剪贴板

  file-clipboard.swift     # macOS 文件剪贴板实现
  file-clipboard.bin       # 文件剪贴板编译产物

  image-clipboard.swift    # macOS 图片剪贴板实现
  image-clipboard.bin      # 图片剪贴板编译产物
```

当前目录采用平铺结构。clipboard 本身已经是独立能力目录，现阶段文件数量不多，平铺更直观。

## 1. 三类剪贴板的区别

### text clipboard

文本剪贴板读写的是字符串内容。

```js
readClipboardText()
writeClipboardText(text)
```

底层示例：

```txt
macOS:   pbpaste / pbcopy
Windows: Get-Clipboard / Set-Clipboard
```

### file clipboard

文件剪贴板读写的是文件引用，也就是文件路径列表。

```js
readClipboardFile()
writeClipboardFile(file)
```

注意：它不是读取或写入文件内容，而是把文件路径作为系统剪贴板中的 file reference。

例如：

```js
await writeClipboardFile('/Users/zzz/Desktop/a.png');
```

之后在 Finder、桌面、聊天窗口、支持文件粘贴的网页里执行 `Cmd + V`，系统或目标应用会根据这个文件引用完成粘贴。

### image clipboard

图片剪贴板读写的是图片内容数据，而不是文件路径。

```js
writeClipboardImage(imagePath)
readClipboardImage(outputPath)
```

因为图片剪贴板里保存的是图片数据，不一定有原始文件名或路径，所以读取图片时必须提供输出路径。

例如：

```js
await readClipboardImage('/Users/zzz/Desktop/from-clipboard.png');
```

如果要保持原始文件格式、大小和文件名，应使用 `writeClipboardFile()`；如果要模拟截图、网页“复制图片”、聊天软件粘贴图片，应使用 `writeClipboardImage()`。

## 2. 编译 file-clipboard.swift

`file-clipboard.swift` 是 macOS 下文件剪贴板的桥接实现，用于读写系统剪贴板中的文件引用。

推荐提前编译，不要在运行时自动编译。

```bash
swiftc clipboard/file-clipboard.swift -o clipboard/file-clipboard.bin
```

## 3. 编译 image-clipboard.swift

`image-clipboard.swift` 是 macOS 下图片剪贴板的桥接实现，用于读写系统剪贴板中的图片内容。

```bash
swiftc clipboard/image-clipboard.swift -o clipboard/image-clipboard.bin
```

## 4. 添加 package.json 脚本

可以在 `package.json` 中添加：

```json
{
  "scripts": {
    "build:file-clipboard": "swiftc clipboard/file-clipboard.swift -o clipboard/file-clipboard.bin",
    "build:image-clipboard": "swiftc clipboard/image-clipboard.swift -o clipboard/image-clipboard.bin",
    "build:clipboard": "npm run build:file-clipboard && npm run build:image-clipboard"
  }
}
```

然后运行：

```bash
npm run build:clipboard
```

也可以只编译文件剪贴板：

```bash
npm run build:file-clipboard
```

或者只编译图片剪贴板：

```bash
npm run build:image-clipboard
```

## 5. 测试 file-clipboard.bin

### 测试写入文件引用

```bash
clipboard/file-clipboard.bin write /Users/zzz/Desktop/a.png
```

如果执行成功，剪贴板中会出现这个文件引用。

可以在 Finder、桌面、聊天输入框或支持文件粘贴的网页里执行：

```txt
Cmd + V
```

如果目标应用支持文件粘贴，应该能看到文件被粘贴或上传。

### 测试读取文件引用

```bash
clipboard/file-clipboard.bin read
```

输出示例：

```json
["/Users/zzz/Desktop/a.png"]
```

如果剪贴板中没有文件引用，通常应该返回空数组：

```json
[]
```

## 6. 测试 image-clipboard.bin

### 测试写入图片内容

```bash
clipboard/image-clipboard.bin write /Users/zzz/Desktop/a.jpg
```

执行成功后，可以在支持图片粘贴的应用中执行 `Cmd + V`。

### 测试读取图片内容

先把图片数据放入剪贴板。推荐用 macOS 截图到剪贴板：

```bash
screencapture -c
```

框选区域后运行：

```bash
clipboard/image-clipboard.bin read /Users/zzz/Desktop/from-clipboard.png
```

如果桌面生成了 `from-clipboard.png`，说明图片剪贴板读取成功。

注意：不要用 Finder 里选中图片文件后 `Cmd + C` 来测试图片读取。Finder 复制图片文件时，剪贴板里通常是文件引用，不是图片内容。

## 7. Node 层调用示例

### 文本剪贴板

```js
import { readClipboardText, writeClipboardText } from './clipboard/text.js';

await writeClipboardText('hello clipboard');

const text = await readClipboardText();
console.log(text);
```

### 写入文件引用

```js
import { writeClipboardFile } from './clipboard/file.js';

await writeClipboardFile('/Users/zzz/Desktop/a.png');
```

### 读取文件引用

```js
import { readClipboardFile } from './clipboard/file.js';

const files = await readClipboardFile();
console.log(files);
```

输出示例：

```js
[
  '/Users/zzz/Desktop/a.png'
]
```

### 写入多个文件引用

```js
import { writeClipboardFile } from './clipboard/file.js';

await writeClipboardFile([
  '/Users/zzz/Desktop/a.png',
  '/Users/zzz/Desktop/b.pdf',
]);
```

### 写入图片内容

```js
import { writeClipboardImage } from './clipboard/image.js';

await writeClipboardImage('/Users/zzz/Desktop/a.jpg');
```

### 读取图片内容

```js
import { readClipboardImage } from './clipboard/image.js';

await readClipboardImage('/Users/zzz/Desktop/from-clipboard.png');
```

## 8. 设计原则

### readClipboardFile 不需要输出目录

`readClipboardFile()` 读取的是剪贴板里的文件路径，不需要把文件另存到某个目录。

```txt
readClipboardFile()
  返回已有文件路径列表
```

如果用户在 Finder 或目标应用里执行 `Cmd + V`，系统会根据剪贴板中的文件引用完成保存或粘贴。

### readClipboardImage 需要输出路径

`readClipboardImage(outputPath)` 读取的是图片数据，剪贴板里不一定有原始文件路径，所以必须提供保存路径。

```txt
readClipboardImage(outputPath)
  把图片数据保存为文件
```

### file 和 image 不要混合

```txt
writeClipboardFile('/Users/zzz/Desktop/a.jpg')
  复制的是文件引用

writeClipboardImage('/Users/zzz/Desktop/a.jpg')
  复制的是图片内容
```

两者不是同一个能力，不应该合并。

## 9. 常见问题

### 为什么 writeClipboardImage 后 readClipboardImage，文件大小可能变大？

因为 image clipboard 会经过图片解码和重新编码。

例如原始文件是 JPEG，但读取剪贴板图片时保存成 PNG，文件体积可能明显变大。

```txt
JPEG 文件
  ↓
图片数据剪贴板
  ↓
重新保存为 PNG
```

如果要保留原始 JPEG 的文件大小、格式和元数据，应使用：

```js
writeClipboardFile('/Users/zzz/Desktop/a.jpg')
```

而不是：

```js
writeClipboardImage('/Users/zzz/Desktop/a.jpg')
```

### 为什么 Finder 里复制图片文件后，readClipboardImage 可能读不到？

因为 Finder 复制图片文件时，剪贴板里通常是 file reference，不是 image data。

此时应该使用：

```js
readClipboardFile()
```

如果是截图到剪贴板，或者浏览器右键“复制图片”，才更适合使用：

```js
readClipboardImage(outputPath)
```

## 10. 推荐测试顺序

### 文件剪贴板

```bash
npm run build:file-clipboard
clipboard/file-clipboard.bin write /Users/zzz/Desktop/a.png
clipboard/file-clipboard.bin read
```

然后在 Finder 或支持文件粘贴的地方执行 `Cmd + V`。

### 图片剪贴板

```bash
npm run build:image-clipboard
screencapture -c
clipboard/image-clipboard.bin read /Users/zzz/Desktop/from-clipboard.png
```

如果桌面生成了 `from-clipboard.png`，说明图片剪贴板读取成功。
