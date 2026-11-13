import Foundation

/// Line protocol between the menu-bar app and the Lightroom plugin.
///
/// One UTF-8 command per line, terminated by `\n`. The plugin listens on
/// localhost; the app connects and writes. Replies use the same framing.
///
///     inc <Parameter> <Delta>
///     dec <Parameter> <Delta>
///     toggle <Parameter>
///     run <Command>
///     ping <Token>
///     probe
///
/// `inc` adds `Delta` (the number may be negative). `dec` subtracts `Delta`.
/// `Parameter` is a canonical name such as `Exposure2012` or
/// `EnableProfileCorrections`. Replies are `ok ...`, `err ...`, `pong <Token>`,
/// or a `compat` block (see `CompatReport`) in answer to `probe`.
public enum WireCommand: Equatable {
    case inc(parameter: String, delta: Double)
    case toggle(parameter: String)
    case run(name: String)
    case ping(token: String)
    case probe

    public static func encode(_ command: WireCommand) -> String {
        switch command {
        case let .inc(parameter, delta):
            return "inc \(parameter) \(StepMath.formatWire(delta))"
        case let .toggle(parameter):
            return "toggle \(parameter)"
        case let .run(name):
            return "run \(name)"
        case let .ping(token):
            return "ping \(token)"
        case .probe:
            return "probe"
        }
    }

    public static func parse(_ raw: String) -> Result<WireCommand, ProtocolError> {
        let line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if line.isEmpty {
            return .failure(.empty)
        }
        let parts = line.split(whereSeparator: { $0 == " " || $0 == "\t" }).map(String.init)
        guard let verb = parts.first else {
            return .failure(.empty)
        }
        switch verb.lowercased() {
        case "inc", "dec":
            guard parts.count == 3 else {
                return .failure(.badArity("expected \(verb) PARAMETER DELTA"))
            }
            guard isParameter(parts[1]) else {
                return .failure(.badParameter(parts[1]))
            }
            guard let magnitude = parseNumber(parts[2]) else {
                return .failure(.badNumber(parts[2]))
            }
            let delta = verb.lowercased() == "dec" ? -magnitude : magnitude
            return .success(.inc(parameter: parts[1], delta: delta))
        case "toggle":
            guard parts.count == 2 else {
                return .failure(.badArity("expected toggle PARAMETER"))
            }
            guard isParameter(parts[1]) else {
                return .failure(.badParameter(parts[1]))
            }
            return .success(.toggle(parameter: parts[1]))
        case "run":
            guard parts.count == 2 else {
                return .failure(.badArity("expected run COMMAND"))
            }
            guard isParameter(parts[1]) else {
                return .failure(.badParameter(parts[1]))
            }
            return .success(.run(name: parts[1]))
        case "ping":
            guard parts.count == 2 else {
                return .failure(.badArity("expected ping TOKEN"))
            }
            guard isToken(parts[1]) else {
                return .failure(.badParameter(parts[1]))
            }
            return .success(.ping(token: parts[1]))
        case "probe":
            guard parts.count == 1 else {
                return .failure(.badArity("expected probe"))
            }
            return .success(.probe)
        default:
            return .failure(.unknownVerb(verb))
        }
    }

    private static func isParameter(_ token: String) -> Bool {
        guard let first = token.unicodeScalars.first, CharacterSet.letters.contains(first) || first == "_" else {
            return false
        }
        return token.unicodeScalars.allSatisfy { CharacterSet.alphanumerics.contains($0) || $0 == "_" }
    }

    private static func isToken(_ token: String) -> Bool {
        !token.isEmpty && token.unicodeScalars.allSatisfy { !CharacterSet.whitespacesAndNewlines.contains($0) }
    }

    private static func parseNumber(_ token: String) -> Double? {
        guard let value = Double(token), value.isFinite else {
            return nil
        }
        return value
    }
}

public enum ProtocolError: Error, Equatable {
    case empty
    case unknownVerb(String)
    case badArity(String)
    case badNumber(String)
    case badParameter(String)
}

public enum WireReply: Equatable {
    case ok(String)
    case err(String)
    case pong(String)

    public static func parse(_ raw: String) -> WireReply? {
        let line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if line == "ok" {
            return .ok("")
        }
        if line.hasPrefix("ok ") {
            return .ok(String(line.dropFirst(3)))
        }
        if line.hasPrefix("err ") {
            return .err(String(line.dropFirst(4)))
        }
        if line == "err" {
            return .err("")
        }
        if line.hasPrefix("pong ") {
            return .pong(String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces))
        }
        return nil
    }
}
