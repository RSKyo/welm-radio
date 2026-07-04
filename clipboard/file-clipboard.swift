import Foundation
import AppKit

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
  file-clipboard write <file> [file...]
  file-clipboard read
""")
}

func expandTilde(_ path: String) -> String {
    return NSString(string: path).expandingTildeInPath
}

func writeFilesToClipboard(_ filePaths: [String]) {
    if filePaths.isEmpty {
        exitWithError("no file path provided", code: 2)
    }

    let fileManager = FileManager.default

    var paths: [String] = []
    var urls: [NSURL] = []

    for rawPath in filePaths {
        let expandedPath = expandTilde(rawPath)
        let url = URL(fileURLWithPath: expandedPath)

        var isDirectory: ObjCBool = false

        if !fileManager.fileExists(atPath: url.path, isDirectory: &isDirectory) {
            exitWithError("file not found: \(url.path)", code: 3)
        }

        paths.append(url.path)
        urls.append(url as NSURL)
    }

    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()

    // Modern file URL representation.
    let ok = pasteboard.writeObjects(urls)

    if !ok {
        exitWithError("failed to write file URL(s) to clipboard", code: 4)
    }

    // Legacy filename representation. Finder and older consumers may still care about this.
    let filenamesType = NSPasteboard.PasteboardType("NSFilenamesPboardType")
    pasteboard.setPropertyList(paths, forType: filenamesType)

    // Text fallback. Useful when pasting into terminal/editor/text fields.
    let pathText = paths.joined(separator: "\n")
    pasteboard.setString(pathText, forType: .string)

    exit(0)
}

func readFilesFromClipboard() {
    let pasteboard = NSPasteboard.general

    let objects = pasteboard.readObjects(
        forClasses: [NSURL.self],
        options: [
            NSPasteboard.ReadingOptionKey.urlReadingFileURLsOnly: true
        ]
    ) ?? []

    let paths = objects.compactMap { object -> String? in
        if let url = object as? URL {
            return url.path
        }

        if let url = object as? NSURL {
            return url.path
        }

        return nil
    }

    do {
        let data = try JSONSerialization.data(withJSONObject: paths, options: [])
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(0)
    } catch {
        exitWithError("failed to encode file paths as JSON: \(error.localizedDescription)", code: 5)
    }
}

let args = Array(CommandLine.arguments.dropFirst())

if args.isEmpty {
    printUsageAndExit()
}

let command = args[0]

switch command {
case "write":
    let filePaths = Array(args.dropFirst())
    writeFilesToClipboard(filePaths)

case "read":
    if args.count > 1 {
        exitWithError("read does not accept file arguments", code: 6)
    }

    readFilesFromClipboard()

default:
    exitWithError("unknown command: \(command)", code: 7)
}