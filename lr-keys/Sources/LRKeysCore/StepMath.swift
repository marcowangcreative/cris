import Foundation

public struct StepMultipliers: Codable, Equatable {
    public var option: Double
    public var shift: Double

    public static let powerKeys = StepMultipliers(option: 0.5, shift: 2)

    public var isValid: Bool {
        option > 0 && shift > 0 && option.isFinite && shift.isFinite
    }
}

public struct ParameterStep: Codable, Equatable {
    public var base: Double
    public var displayName: String

    public var isValid: Bool {
        base > 0 && base.isFinite && !displayName.isEmpty
    }
}

public enum StepMath {
    /// Option scales the base step by `multipliers.option` (0.5 in the Power Keys map).
    /// Shift scales it by `multipliers.shift` (2). Both held together multiply, so the
    /// defaults land back on 1x.
    public static func multiplier(option: Bool, shift: Bool, multipliers: StepMultipliers) -> Double {
        var scale = 1.0
        if option {
            scale *= multipliers.option
        }
        if shift {
            scale *= multipliers.shift
        }
        return scale
    }

    public static func delta(
        base: Double,
        direction: Direction,
        option: Bool,
        shift: Bool,
        multipliers: StepMultipliers
    ) -> Double {
        let sign: Double = direction == .increase ? 1 : -1
        return sign * abs(base) * multiplier(option: option, shift: shift, multipliers: multipliers)
    }

    public static func readout(displayName: String, delta: Double) -> String {
        "\(displayName) \(formatSigned(delta))"
    }

    public static func formatSigned(_ value: Double) -> String {
        let rounded = (value * 10_000).rounded() / 10_000
        let sign = rounded < 0 ? "-" : "+"
        var body = String(format: "%.4f", locale: posix, abs(rounded))
        while body.contains(".") && body.hasSuffix("0") {
            body.removeLast()
        }
        if body.hasSuffix(".") {
            body.removeLast()
        }
        if body.isEmpty || body == "-0" {
            body = "0"
        }
        return sign + body
    }

    /// Dot-decimal, trimmed, independent of the user's locale.
    public static func formatWire(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        let rounded = (value * 1_000_000).rounded() / 1_000_000
        var body = String(format: "%.6f", locale: posix, abs(rounded))
        while body.contains(".") && body.hasSuffix("0") {
            body.removeLast()
        }
        if body.hasSuffix(".") {
            body.removeLast()
        }
        if rounded < 0 && body != "0" {
            return "-" + body
        }
        return body
    }

    private static let posix = Locale(identifier: "en_US_POSIX")
}
