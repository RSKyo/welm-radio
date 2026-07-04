import Foundation
import AppKit

let pngType = NSPasteboard.PasteboardType("public.png")
let tiffType = NSPasteboard.PasteboardType("public.tiff")

func writeStderr(_ message: String) {
    let data = Data((message + "\n").utf8)
    FileHandle.standardError.write(data)
}

func exitWithError(_ message: String, code: Int32 = 1) -> Never {
    writeStderr(message)
    exit(code)
}

func printUsageAndExit() -> Never {
    exitWithError("""
usage:
  image-clipboard write <image>
  image-clipboard read <output.png>
""")
}

func expandTilde(_ path: String) -> String {
    return NSString(string: path).expandingTildeInPath
}

func pngData(from image: NSImage) -> Data? {
    guard let tiffData = image.tiffRepresentation else {
        return nil
    }

    guard let bitmap = NSBitmapImageRep(data: tiffData) else {
        return nil
    }

    return bitmap.representation(using: .png, properties: [:])
}

func writeImageToClipboard(_ imagePath: String) {
    let expandedPath = expandTilde(imagePath)
    let url = URL(fileURLWithPath: expandedPath)

    if !FileManager.default.fileExists(atPath: url.path) {
        exitWithError("image file not found: \(url.path)", code: 2)
    }

    guard let image = NSImage(contentsOfFile: url.path) else {
        exitWithError("failed to load image: \(url.path)", code: 3)
    }

    guard let tiffData = image.tiffRepresentation else {
        exitWithError("failed to create TIFF image data", code: 4)
    }

    guard let png = pngData(from: image) else {
        exitWithError("failed to create PNG image data", code: 5)
    }

    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()

    pasteboard.setData(png, forType: pngType)
    pasteboard.setData(tiffData, forType: tiffType)

    exit(0)
}

func readImageFromClipboard(_ outputPath: String) {
    let expandedPath = expandTilde(outputPath)
    let outputURL = URL(fileURLWithPath: expandedPath)

    let pasteboard = NSPasteboard.general

    if let png = pasteboard.data(forType: pngType) {
        do {
            try png.write(to: outputURL)
            exit(0)
        } catch {
            exitWithError("failed to write PNG file: \(error.localizedDescription)", code: 6)
        }
    }

    if let tiff = pasteboard.data(forType: tiffType),
       let bitmap = NSBitmapImageRep(data: tiff),
       let png = bitmap.representation(using: .png, properties: [:]) {
        do {
            try png.write(to: outputURL)
            exit(0)
        } catch {
            exitWithError("failed to write converted PNG file: \(error.localizedDescription)", code: 7)
        }
    }

    if let image = NSImage(pasteboard: pasteboard),
       let png = pngData(from: image) {
        do {
            try png.write(to: outputURL)
            exit(0)
        } catch {
            exitWithError("failed to write image file: \(error.localizedDescription)", code: 8)
        }
    }

    exitWithError("clipboard does not contain image data", code: 9)
}

let args = Array(CommandLine.arguments.dropFirst())

if args.isEmpty {
    printUsageAndExit()
}

let command = args[0]

switch command {
case "write":
    if args.count != 2 {
        exitWithError("write requires exactly one image path", code: 10)
    }

    writeImageToClipboard(args[1])

case "read":
    if args.count != 2 {
        exitWithError("read requires exactly one output path", code: 11)
    }

    readImageFromClipboard(args[1])

default:
    exitWithError("unknown command: \(command)", code: 12)
}