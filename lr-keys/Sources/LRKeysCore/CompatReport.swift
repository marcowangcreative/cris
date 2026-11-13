import Foundation

public struct CompatEntry: Codable, Equatable, Identifiable {
    public var scope: String
    public var name: String
    public var status: String
    public var detail: String
    public var minimum: Double?
    public var maximum: Double?

    public var id: String { "\(scope):\(name)" }

    public var summary: String {
        var parts: [String] = []
        if let minimum, let maximum {
            parts.append("\(StepMath.formatWire(minimum)) to \(StepMath.formatWire(maximum))")
        }
        if !detail.isEmpty {
            parts.append(detail)
        }
        return parts.joined(separator: " · ")
    }
}

public struct CompatReport: Codable, Equatable {
    public var lightroomVersion: String
    public var sdkVersion: String
    public var probedAt: String
    public var entries: [CompatEntry]

    public var passCount: Int { entries.filter { $0.status == "pass" }.count }
    public var failCount: Int { entries.filter { $0.status == "fail" }.count }
    public var skipCount: Int { entries.filter { $0.status == "skip" }.count }

    /// Parameters the editor should grey out. Skipped probes (not in Develop)
    /// do not count. A failed function greys the catalog parameter that calls it.
    public func disabledParameters(in catalog: [DevelopParameter]) -> Set<String> {
        let failedParameters = Set(entries.filter { $0.scope == "parameter" && $0.status == "fail" }.map(\.name))
        let failedFunctions = Set(entries.filter { $0.scope == "function" && $0.status == "fail" }.map(\.name))
        var names = failedParameters
        for parameter in catalog where failedFunctions.contains(parameter.sdkName) {
            names.insert(parameter.canonical)
        }
        return names
    }

    public static func load(from url: URL) throws -> CompatReport {
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode(CompatReport.self, from: data)
    }

    /// Parses a `compat begin` … `compat end` block. Returns nil until `compat end`.
    public static func parse(lines: [String]) -> CompatReport? {
        var versionLightroom = ""
        var versionSDK = ""
        var entries: [CompatEntry] = []
        var sawBegin = false
        var sawEnd = false
        for raw in lines {
            let line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if line == "compat begin" {
                sawBegin = true
                continue
            }
            if line == "compat end" {
                sawEnd = true
                break
            }
            guard line.hasPrefix("compat ") else { continue }
            let body = String(line.dropFirst("compat ".count))
            if body.hasPrefix("version lightroom ") {
                versionLightroom = String(body.dropFirst("version lightroom ".count))
                continue
            }
            if body.hasPrefix("version sdk ") {
                versionSDK = String(body.dropFirst("version sdk ".count))
                continue
            }
            let parts = body.split(separator: " ", maxSplits: 3, omittingEmptySubsequences: true).map(String.init)
            guard parts.count >= 3 else { continue }
            let status = parts[0]
            let scope = parts[1]
            let nameAndTail = parts[2]
            let tail = parts.count == 4 ? parts[3] : ""
            let name: String
            let extra: String
            if nameAndTail.contains("=") {
                name = ""
                extra = nameAndTail + (tail.isEmpty ? "" : " " + tail)
            } else {
                name = nameAndTail
                extra = tail
            }
            guard status == "pass" || status == "fail" || status == "skip", !name.isEmpty else {
                continue
            }
            var detail = ""
            var minimum: Double?
            var maximum: Double?
            var fields = extra
            if let range = fields.range(of: "detail=") {
                detail = String(fields[range.upperBound...]).trimmingCharacters(in: .whitespaces)
                fields = String(fields[..<range.lowerBound])
            }
            for token in fields.split(whereSeparator: { $0 == " " || $0 == "\t" }) {
                let piece = String(token)
                if piece.hasPrefix("min="), let value = Double(piece.dropFirst(4)) {
                    minimum = value
                } else if piece.hasPrefix("max="), let value = Double(piece.dropFirst(4)) {
                    maximum = value
                }
            }
            entries.append(CompatEntry(
                scope: scope,
                name: name,
                status: status,
                detail: detail,
                minimum: minimum,
                maximum: maximum
            ))
        }
        guard sawBegin, sawEnd else { return nil }
        return CompatReport(
            lightroomVersion: versionLightroom,
            sdkVersion: versionSDK,
            probedAt: "",
            entries: entries
        )
    }
}
