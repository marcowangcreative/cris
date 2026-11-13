#if os(macOS)
import AppKit
import LRKeysCore

let arguments = Array(CommandLine.arguments.dropFirst())
let cliCommands: Set<String> = ["check", "import", "probe", "help", "-h", "--help"]
if let command = arguments.first, cliCommands.contains(command) {
    exit(KeymapCLI.run(arguments))
}
let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.setActivationPolicy(.accessory)
application.run()
#else
import Foundation
import LRKeysCore

let arguments = Array(CommandLine.arguments.dropFirst())
if arguments.isEmpty {
    fputs("The LR Keys menu-bar app requires macOS 13 or later.\n", stderr)
}
exit(KeymapCLI.run(arguments))
#endif
