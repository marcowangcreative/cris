import Foundation

public enum KeymapCLI {
    public static let usage = """
    lr-keys check <keymap.json>
    lr-keys import <power-keys.json>
    lr-keys probe --port 58421
    lr-keys help

    With no command on macOS, lr-keys opens the menu-bar app.
    The menu-bar app requires macOS 13 or later.
    """

    public static func run(_ arguments: [String]) -> Int32 {
        guard let command = arguments.first else {
            fputs(usage + "\n", stderr)
            return 1
        }
        switch command {
        case "help", "-h", "--help":
            print(usage)
            return 0
        case "check":
            return check(arguments.dropFirst())
        case "import":
            return importMap(arguments.dropFirst())
        case "probe":
            return probe(arguments.dropFirst())
        default:
            fputs("Unknown command \(command)\n\(usage)\n", stderr)
            return 1
        }
    }

    private static func check(_ args: ArraySlice<String>) -> Int32 {
        guard let path = args.first else {
            fputs("check needs a keymap path\n", stderr)
            return 1
        }
        do {
            let data = try Data(contentsOf: URL(fileURLWithPath: path))
            let keymap = try Keymap.load(data: data)
            print("\(keymap.name): \(keymap.bindings.count) bindings, port \(keymap.port)")
            let problems = keymap.issues()
            if problems.isEmpty {
                print("ok")
                return 0
            }
            for problem in problems {
                print(problem)
            }
            return 2
        } catch {
            fputs("Could not read keymap: \(error)\n", stderr)
            return 1
        }
    }

    private static func importMap(_ args: ArraySlice<String>) -> Int32 {
        guard let path = args.first else {
            fputs("import needs a JSON path\n", stderr)
            return 1
        }
        do {
            let data = try Data(contentsOf: URL(fileURLWithPath: path))
            let result = try PowerKeysImporter.importMap(data)
            for warning in result.warnings {
                fputs("warning: \(warning)\n", stderr)
            }
            let encoded = try result.keymap.encoded()
            FileHandle.standardOutput.write(encoded)
            FileHandle.standardOutput.write(Data([0x0A]))
            return 0
        } catch {
            fputs("Import failed: \(error)\n", stderr)
            return 1
        }
    }

    private static func probe(_ args: ArraySlice<String>) -> Int32 {
        var port = Keymap.defaultPort
        var index = args.startIndex
        while index < args.endIndex {
            let part = args[index]
            if part == "--port" {
                let next = args.index(after: index)
                guard next < args.endIndex, let value = UInt16(args[next]) else {
                    fputs("probe --port needs a number\n", stderr)
                    return 1
                }
                port = value
                index = args.index(after: next)
                continue
            }
            fputs("Unknown probe option \(part)\n", stderr)
            return 1
        }
        let client = LineClient()
        do {
            try client.connect(port: port, timeout: 2)
            let pingStart = Date()
            try client.sendLine(WireCommand.encode(.ping(token: "1")))
            let pingReply = try client.receiveLine(timeout: 2)
            let pingMS = Date().timeIntervalSince(pingStart) * 1000
            let command = WireCommand.inc(parameter: "Shadows2012", delta: 5)
            let commandStart = Date()
            try client.sendLine(WireCommand.encode(command))
            let commandReply = try client.receiveLine(timeout: 2)
            let commandMS = Date().timeIntervalSince(commandStart) * 1000
            client.close()
            print(String(format: "ping %.3f ms %@", pingMS, pingReply))
            print(String(format: "command %.3f ms %@", commandMS, commandReply))
            guard WireReply.parse(pingReply) == .pong("1") else {
                return 1
            }
            guard let reply = WireReply.parse(commandReply), case .ok = reply else {
                return 1
            }
            return 0
        } catch {
            client.close()
            fputs("Probe failed: \(error)\n", stderr)
            return 1
        }
    }
}
