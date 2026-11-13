import Foundation

public struct ImportResult: Equatable {
    public var keymap: Keymap
    public var warnings: [String]
}

public enum ImportFailure: Error, Equatable {
    case malformedJSON
    case noBindings
}

/// Turns a Power Keys export, or anything close to one, into an LR Keys keymap.
/// The real "Power Keys MWP Map" file was not available, so this accepts several
/// shapes and skips entries it cannot understand.
public enum PowerKeysImporter {
    public static func importMap(_ data: Data) throws -> ImportResult {
        let root: Any
        do {
            root = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
        } catch {
            throw ImportFailure.malformedJSON
        }
        if let native = nativeKeymap(from: root, data: data) {
            return native
        }
        return try tolerantImport(root)
    }

    private static func nativeKeymap(from root: Any, data: Data) -> ImportResult? {
        guard let object = root as? [String: Any],
              let bindings = object["bindings"] as? [Any],
              let first = bindings.first as? [String: Any],
              first["kind"] != nil,
              first["parameter"] != nil
        else {
            return nil
        }
        guard let keymap = try? Keymap.load(data: data) else {
            return nil
        }
        return ImportResult(keymap: keymap, warnings: keymap.issues().filter { $0.hasPrefix("Conflict") })
    }

    private static func tolerantImport(_ root: Any) throws -> ImportResult {
        var warnings: [String] = []
        var name = "Imported Power Keys Map"
        var entries: [(hint: String?, value: Any)] = []

        if let array = root as? [Any] {
            entries = array.map { (nil, $0) }
        } else if let object = root as? [String: Any] {
            name = stringField(object, keys: ["name", "title", "mapname", "profilename", "profile"]) ?? name
            let containers = ["shortcuts", "mappings", "bindings", "adjustments", "keys", "actions", "map", "buttons", "toggles", "commands"]
            var consumed = Set(containers)
            consumed.formUnion(["name", "title", "mapname", "profilename", "profile", "version", "format", "author", "app", "application", "created", "exported", "comment", "comments", "description", "port", "multipliers", "steps", "notes"])
            for key in containers {
                guard let value = field(object, named: key) else { continue }
                if let list = value as? [Any] {
                    entries.append(contentsOf: list.map { (nil, $0) })
                } else if let nested = value as? [String: Any] {
                    for (hint, item) in nested {
                        entries.append((hint, item))
                    }
                }
            }
            for (key, value) in object {
                let folded = DevelopCatalog.compact(key)
                if consumed.contains(folded) || consumed.contains(key.lowercased()) {
                    continue
                }
                entries.append((key, value))
            }
        } else {
            throw ImportFailure.malformedJSON
        }

        var bindings: [KeyBinding] = []
        var steps: [String: ParameterStep] = [:]
        for entry in entries {
            let parsed = parseEntry(hint: entry.hint, value: entry.value)
            warnings.append(contentsOf: parsed.warnings)
            bindings.append(contentsOf: parsed.bindings)
            if let step = parsed.step {
                steps[step.parameter] = ParameterStep(base: step.base, displayName: step.displayName)
            }
        }

        if bindings.isEmpty {
            throw ImportFailure.noBindings
        }

        for binding in bindings where binding.kind == .adjust {
            if steps[binding.parameter] == nil, let known = DevelopCatalog.parameter(binding.parameter) {
                steps[binding.parameter] = ParameterStep(base: known.defaultStep, displayName: known.displayName)
            }
        }

        let keymap = Keymap(
            version: Keymap.currentVersion,
            name: name,
            port: Keymap.defaultPort,
            multipliers: .powerKeys,
            steps: steps,
            bindings: bindings
        ).normalized()

        for conflict in keymap.conflicts() {
            warnings.append("Conflict on \(conflict.label).")
        }
        return ImportResult(keymap: keymap, warnings: warnings)
    }

    private struct Parsed {
        var bindings: [KeyBinding] = []
        var step: (parameter: String, base: Double, displayName: String)?
        var warnings: [String] = []
    }

    private static func parseEntry(hint: String?, value: Any) -> Parsed {
        if let text = value as? String {
            return parseAssignment(hint: hint, keyText: text, amount: nil, kindHint: nil)
        }
        if let number = jsonDouble(value), let hint {
            return parseAmountHint(hint, amount: number)
        }
        if let list = value as? [Any] {
            guard let first = list.first else {
                return Parsed(warnings: ["Skipped an empty list."])
            }
            var parsed = parseEntry(hint: hint, value: first)
            if list.count > 1 {
                parsed.warnings.append("Used only the first value for \(hint ?? "an entry"); \(list.count - 1) extra value(s) ignored.")
            }
            return parsed
        }
        guard var object = value as? [String: Any] else {
            return Parsed(warnings: ["Skipped \(hint ?? "an entry") because it was not a key binding."])
        }
        if let nested = field(object, named: "keys") as? [String: Any] {
            for (key, item) in nested where field(object, named: key) == nil {
                object[key] = item
            }
        }

        let kindHint = stringField(object, keys: ["kind", "type", "mode", "actiontype"])
        let explicitName = stringField(object, keys: ["name", "parameter", "param", "slider", "id", "title", "setting", "command", "action"])
        let name = explicitName ?? hint
        let amount = doubleField(object, keys: ["amount", "step", "delta", "incrementamount", "base"])

        let increase = keyField(object, keys: ["increase", "increasekey", "keyincrease", "up", "plus", "inc", "positive", "right", "increment", "keyup", "keyplus"])
        let decrease = keyField(object, keys: ["decrease", "decreasekey", "keydecrease", "down", "minus", "dec", "negative", "left", "decrement", "keydown", "keyminus"])
        let single = keyField(object, keys: ["key", "shortcut", "hotkey", "binding", "char", "character"])

        return assemble(
            name: name,
            increase: increase,
            decrease: decrease,
            single: single,
            amount: amount,
            kindHint: kindHint,
            extraKeyWarning: arrayCount(object, keys: ["increasekey", "decreasekey", "key", "shortcut"]) > 1
        )
    }

    private static func parseAmountHint(_ hint: String, amount: Double) -> Parsed {
        let split = splitHint(hint)
        guard let known = DevelopCatalog.parameter(split.name), known.kind == .adjust, amount > 0 else {
            return Parsed(warnings: ["Ignored amount \(amount) for \(hint)."])
        }
        return Parsed(step: (known.canonical, amount, known.displayName))
    }

    private static func parseAssignment(hint: String?, keyText: String, amount: Double?, kindHint: String?) -> Parsed {
        guard let hint else {
            return Parsed(warnings: ["Skipped key \(keyText) because it had no parameter name."])
        }
        let split = splitHint(hint)
        let spec = keySpec(keyText)
        return assemble(
            name: split.name,
            increase: split.direction == .increase ? spec : nil,
            decrease: split.direction == .decrease ? spec : nil,
            single: split.direction == nil ? spec : nil,
            amount: amount,
            kindHint: kindHint,
            extraKeyWarning: false
        )
    }

    private static func assemble(
        name: String?,
        increase: KeySpec?,
        decrease: KeySpec?,
        single: KeySpec?,
        amount: Double?,
        kindHint: String?,
        extraKeyWarning: Bool
    ) -> Parsed {
        guard let name, !name.isEmpty else {
            return Parsed(warnings: ["Skipped a binding with no parameter name."])
        }
        guard let known = DevelopCatalog.parameter(name) else {
            return Parsed(warnings: ["Skipped unrecognized parameter \"\(name)\"."])
        }
        var parsed = Parsed()
        if extraKeyWarning {
            parsed.warnings.append("Used the first key listed for \(known.displayName).")
        }
        if known.kind == .adjust, let amount, amount > 0 {
            parsed.step = (known.canonical, amount, known.displayName)
        } else if let amount, amount <= 0 {
            parsed.warnings.append("Ignored non-positive step \(amount) for \(known.displayName).")
        }

        let forced = kind(from: kindHint)
        let kind = forced ?? known.kind
        if kind != known.kind && forced == nil {
            parsed.warnings.append("\(known.displayName) was imported as \(known.kind.rawValue).")
        }

        switch kind == .adjust ? known.kind : kind {
        case .adjust where known.kind == .adjust:
            if let increase {
                parsed.bindings.append(binding(spec: increase, kind: .adjust, parameter: known, direction: .increase))
            }
            if let decrease {
                parsed.bindings.append(binding(spec: decrease, kind: .adjust, parameter: known, direction: .decrease))
            }
            if increase == nil && decrease == nil, let single {
                parsed.bindings.append(binding(spec: single, kind: .adjust, parameter: known, direction: .increase))
                parsed.warnings.append("Assumed \(single.label) increases \(known.displayName).")
            }
            if parsed.bindings.isEmpty && parsed.step == nil {
                parsed.warnings.append("Skipped \(known.displayName) because it had no key.")
            }
        case .toggle, .run:
            let spec = single ?? increase ?? decrease
            if let spec {
                parsed.bindings.append(binding(spec: spec, kind: known.kind, parameter: known, direction: nil))
            } else {
                parsed.warnings.append("Skipped \(known.displayName) because it had no key.")
            }
        default:
            parsed.warnings.append("Skipped \(known.displayName).")
        }
        return parsed
    }

    private struct KeySpec {
        var label: String
        var code: Int?
    }

    private static func binding(spec: KeySpec, kind: ActionKind, parameter: DevelopParameter, direction: Direction?) -> KeyBinding {
        KeyBinding(key: spec.label, keyCode: spec.code, kind: kind, parameter: parameter.canonical, direction: direction)
    }

    private struct HintSplit {
        var name: String
        var direction: Direction?
    }

    private static func splitHint(_ hint: String) -> HintSplit {
        let pieces = hint.split { $0 == "." || $0 == ":" || $0 == "/" }.map(String.init)
        if pieces.count >= 2 {
            let role = DevelopCatalog.compact(pieces.last!)
            if let direction = direction(forRole: role) {
                return HintSplit(name: pieces.dropLast().joined(separator: " "), direction: direction)
            }
            if role == "amount" || role == "step" || role == "delta" || role == "base" {
                return HintSplit(name: pieces.dropLast().joined(separator: " "), direction: nil)
            }
        }
        let compact = DevelopCatalog.compact(hint)
        let suffixes: [(String, Direction)] = [
            ("increasekey", .increase), ("decreasekey", .decrease),
            ("keyup", .increase), ("keydown", .decrease),
            ("increment", .increase), ("decrement", .decrease),
            ("increase", .increase), ("decrease", .decrease),
            ("plus", .increase), ("minus", .decrease),
            ("up", .increase), ("down", .decrease),
            ("inc", .increase), ("dec", .decrease),
        ]
        for (suffix, direction) in suffixes where compact.hasSuffix(suffix) && compact.count > suffix.count {
            let head = String(compact.dropLast(suffix.count))
            return HintSplit(name: head, direction: direction)
        }
        return HintSplit(name: hint, direction: nil)
    }

    private static func direction(forRole role: String) -> Direction? {
        switch role {
        case "increase", "increasekey", "up", "plus", "inc", "positive", "right", "increment":
            return .increase
        case "decrease", "decreasekey", "down", "minus", "dec", "negative", "left", "decrement":
            return .decrease
        default:
            return nil
        }
    }

    private static func kind(from hint: String?) -> ActionKind? {
        guard let hint else { return nil }
        switch DevelopCatalog.compact(hint) {
        case "adjust", "slider", "inc", "increment":
            return .adjust
        case "toggle", "checkbox", "check":
            return .toggle
        case "run", "button", "command", "action":
            return .run
        default:
            return nil
        }
    }

    private static func keyField(_ object: [String: Any], keys: [String]) -> KeySpec? {
        for key in object.keys {
            let folded = DevelopCatalog.compact(key)
            guard keys.contains(folded) else { continue }
            if let spec = keySpec(object[key]!) {
                return spec
            }
        }
        return nil
    }

    private static func keySpec(_ value: Any) -> KeySpec? {
        if let string = value as? String {
            guard let label = MacKeyCodes.normalize(string) else { return nil }
            return KeySpec(label: label, code: MacKeyCodes.code(for: label))
        }
        if value is Bool {
            return nil
        }
        if let number = value as? NSNumber {
            let code = number.intValue
            guard code >= 0 && code < 512 else { return nil }
            let label = MacKeyCodes.label(for: code) ?? "key#\(code)"
            return KeySpec(label: label, code: code)
        }
        if let list = value as? [Any], let first = list.first {
            return keySpec(first)
        }
        return nil
    }

    private static func stringField(_ object: [String: Any], keys: [String]) -> String? {
        for key in object.keys {
            let folded = DevelopCatalog.compact(key)
            guard keys.contains(folded) else { continue }
            if let string = object[key] as? String {
                let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
                if folded == "action" || folded == "type" || folded == "kind" || folded == "mode" {
                    if kind(from: trimmed) != nil {
                        continue
                    }
                }
                if !trimmed.isEmpty {
                    return trimmed
                }
            }
        }
        return nil
    }

    private static func doubleField(_ object: [String: Any], keys: [String]) -> Double? {
        for key in object.keys {
            guard keys.contains(DevelopCatalog.compact(key)) else { continue }
            if let number = jsonDouble(object[key]!) {
                return number
            }
        }
        return nil
    }

    private static func arrayCount(_ object: [String: Any], keys: [String]) -> Int {
        var largest = 0
        for key in object.keys {
            guard keys.contains(DevelopCatalog.compact(key)) else { continue }
            if let list = object[key] as? [Any] {
                largest = max(largest, list.count)
            }
        }
        return largest
    }

    private static func field(_ object: [String: Any], named: String) -> Any? {
        let want = DevelopCatalog.compact(named)
        for key in object.keys where DevelopCatalog.compact(key) == want {
            return object[key]
        }
        return nil
    }

    private static func jsonDouble(_ value: Any) -> Double? {
        if value is Bool {
            return nil
        }
        if let number = value as? NSNumber {
            return number.doubleValue
        }
        if let string = value as? String {
            return Double(string.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        return nil
    }
}
