import AppKit

if CommandLine.arguments.count < 2 {
    exit(1)
}

let path = CommandLine.arguments[1]

guard let image = NSImage(contentsOfFile: path) else {
    exit(1)
}

let pasteboard = NSPasteboard.general
pasteboard.clearContents()
pasteboard.writeObjects([image])