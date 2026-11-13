import Foundation

public struct KeyBinding: Codable, Equatable, Identifiable {
    public var id: UUID
    public var key: String
    public var keyCode: Int?
    public var kind: ActionKind
    public var parameter: String
    public var direction: Direction?

    public init(
        id: UUID = UUID(),
        key: String,
        keyCode: Int? = nil,
        kind: ActionKind,
        parameter: String,
        direction: Direction? = nil
    ) {
        self.id = id
        self.key = key
        self.keyCode = keyCode
        self.kind = kind
        self.parameter = parameter
        self.direction = direction
    }
}

public struct KeyConflict: Equatable {
    public var label: String
    public var indices: [Int]
}

public enum KeyDecision: Equatable {
    case pass
    case conflict(String)
    case unsupported(String)
    case fire(KeyBinding, WireCommand, String)
}

public struct Keymap: Codable, Equatable {
    public var version: Int
    public var name: String
    public var port: UInt16
    public var multipliers: StepMultipliers
    public var steps: [String: ParameterStep]
    public var bindings: [KeyBinding]

    public init(
        version: Int,
        name: String,
        port: UInt16,
        multipliers: StepMultipliers,
        steps: [String: ParameterStep],
        bindings: [KeyBinding]
    ) {
        self.version = version
        self.name = name
        self.port = port
        self.multipliers = multipliers
        self.steps = steps
        self.bindings = bindings
    }

    public static let currentVersion = 1
    public static let defaultPort: UInt16 = 58421

    public func normalized() -> Keymap {
        var copy = self
        if copy.version == 0 {
            copy.version = Keymap.currentVersion
        }
        if copy.port == 0 {
            copy.port = Keymap.defaultPort
        }
        if !copy.multipliers.isValid {
            copy.multipliers = .powerKeys
        }
        copy.bindings = copy.bindings.map { binding in
            var binding = binding
            if let label = MacKeyCodes.normalize(binding.key) {
                binding.key = label
                if let code = MacKeyCodes.code(for: label) {
                    binding.keyCode = code
                }
            }
            if binding.kind == .adjust, binding.direction == nil {
                binding.direction = .increase
            }
            return binding
        }
        for binding in copy.bindings where binding.kind == .adjust {
            if copy.steps[binding.parameter] == nil, let known = DevelopCatalog.parameter(binding.parameter) {
                copy.steps[binding.parameter] = ParameterStep(base: known.defaultStep, displayName: known.displayName)
            }
        }
        return copy
    }

    public func issues() -> [String] {
        var items: [String] = []
        if version != Keymap.currentVersion {
            items.append("Unsupported keymap version \(version).")
        }
        if !multipliers.isValid {
            items.append("Step multipliers must be greater than zero.")
        }
        for (name, step) in steps.sorted(by: { $0.key < $1.key }) where !step.isValid {
            items.append("\(name) step must be greater than zero.")
        }
        for (index, binding) in bindings.enumerated() {
            if MacKeyCodes.normalize(binding.key) == nil {
                items.append("Binding \(index + 1) has an empty or unknown key.")
            }
            if binding.parameter.isEmpty {
                items.append("Binding \(index + 1) is missing a parameter.")
            }
            if binding.kind == .adjust && binding.direction == nil {
                items.append("\(binding.parameter) is missing a direction.")
            }
        }
        for conflict in conflicts() {
            let keys = conflict.indices.map { bindings[$0].key }.joined(separator: ", ")
            items.append("Conflict on \(conflict.label) (\(keys)).")
        }
        return items
    }

    public func conflicts() -> [KeyConflict] {
        var byLabel: [String: [Int]] = [:]
        var byCode: [Int: [Int]] = [:]
        for (index, binding) in bindings.enumerated() {
            guard let label = MacKeyCodes.normalize(binding.key), !label.isEmpty else {
                continue
            }
            byLabel[label, default: []].append(index)
            let code = binding.keyCode ?? MacKeyCodes.code(for: label)
            if let code {
                byCode[code, default: []].append(index)
            }
        }
        var groups: [String: Set<Int>] = [:]
        for (label, indices) in byLabel where indices.count > 1 {
            groups[label] = Set(indices)
        }
        for (code, indices) in byCode where Set(indices).count > 1 {
            let label = MacKeyCodes.label(for: code) ?? "key#\(code)"
            groups[label, default: []].formUnion(indices)
        }
        return groups.keys.sorted().map { label in
            KeyConflict(label: label, indices: groups[label]!.sorted())
        }
    }

    public func decide(
        keyCode: Int,
        option: Bool,
        shift: Bool,
        command: Bool,
        control: Bool,
        textField: Bool,
        unsupported: Set<String> = []
    ) -> KeyDecision {
        if textField || command || control {
            return .pass
        }
        let matches = bindings.enumerated().filter { item in
            let binding = item.element
            if let stored = binding.keyCode {
                return stored == keyCode
            }
            if let label = MacKeyCodes.normalize(binding.key), let code = MacKeyCodes.code(for: label) {
                return code == keyCode
            }
            return false
        }
        if matches.isEmpty {
            return .pass
        }
        if matches.count > 1 {
            return .conflict(matches[0].element.key)
        }
        let binding = matches[0].element
        if unsupported.contains(binding.parameter) {
            let display = steps[binding.parameter]?.displayName
                ?? DevelopCatalog.parameter(binding.parameter)?.displayName
                ?? binding.parameter
            return .unsupported(display)
        }
        guard let built = makeCommand(for: binding, option: option, shift: shift) else {
            return .pass
        }
        return .fire(binding, built.command, built.readout)
    }

    public func makeCommand(for binding: KeyBinding, option: Bool, shift: Bool) -> (command: WireCommand, readout: String)? {
        let known = DevelopCatalog.parameter(binding.parameter)
        let display = steps[binding.parameter]?.displayName ?? known?.displayName ?? binding.parameter
        switch binding.kind {
        case .adjust:
            guard let direction = binding.direction else {
                return nil
            }
            let base = steps[binding.parameter]?.base ?? known?.defaultStep
            guard let base, base > 0 else {
                return nil
            }
            let amount = StepMath.delta(
                base: base,
                direction: direction,
                option: option,
                shift: shift,
                multipliers: multipliers
            )
            return (
                .inc(parameter: binding.parameter, delta: amount),
                StepMath.readout(displayName: display, delta: amount)
            )
        case .toggle:
            return (.toggle(parameter: binding.parameter), display)
        case .run:
            return (.run(name: binding.parameter), display)
        }
    }

    public func binding(_ id: UUID) -> KeyBinding? {
        bindings.first { $0.id == id }
    }
}

public enum KeymapError: Error, Equatable {
    case malformedJSON
    case unsupportedVersion(Int)
    case unreadable
}

public extension Keymap {
    static func load(data: Data) throws -> Keymap {
        let decoder = JSONDecoder()
        do {
            let map = try decoder.decode(Keymap.self, from: data)
            if map.version != Keymap.currentVersion && map.version != 0 {
                throw KeymapError.unsupportedVersion(map.version)
            }
            return map.normalized()
        } catch let error as KeymapError {
            throw error
        } catch {
            throw KeymapError.malformedJSON
        }
    }

    static func loadDefault() throws -> Keymap {
        try load(data: defaultKeymapData())
    }

    static func defaultKeymapData() throws -> Data {
        try resourceData(named: "default-keymap")
    }

    static func resourceData(named name: String) throws -> Data {
        if let url = Bundle.module.url(forResource: name, withExtension: "json") {
            return try Data(contentsOf: url)
        }
        if let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Resources") {
            return try Data(contentsOf: url)
        }
        let source = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Resources/\(name).json")
        if FileManager.default.fileExists(atPath: source.path) {
            return try Data(contentsOf: source)
        }
        throw KeymapError.unreadable
    }

    func encoded() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(normalized())
    }
}

public enum KeymapStore {
    public static func save(_ keymap: Keymap, directory: URL) throws {
        let fileManager = FileManager.default
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        let keymapURL = directory.appendingPathComponent("keymap.json")
        let portURL = directory.appendingPathComponent("port.txt")
        let data = try keymap.encoded()
        try data.write(to: keymapURL, options: .atomic)
        try "\(keymap.port)\n".data(using: .utf8)!.write(to: portURL, options: .atomic)
    }

    public static func load(directory: URL) throws -> Keymap {
        let url = directory.appendingPathComponent("keymap.json")
        let data = try Data(contentsOf: url)
        return try Keymap.load(data: data)
    }
}
