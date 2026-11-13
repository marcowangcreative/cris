import XCTest
@testable import LRKeysCore

final class StepAndKeymapTests: XCTestCase {
    func testOptionAndShiftMultiply() {
        let multipliers = StepMultipliers.powerKeys
        XCTAssertEqual(StepMath.multiplier(option: false, shift: false, multipliers: multipliers), 1)
        XCTAssertEqual(StepMath.multiplier(option: true, shift: false, multipliers: multipliers), 0.5)
        XCTAssertEqual(StepMath.multiplier(option: false, shift: true, multipliers: multipliers), 2)
        XCTAssertEqual(StepMath.multiplier(option: true, shift: true, multipliers: multipliers), 1)
        XCTAssertEqual(
            StepMath.delta(base: 5, direction: .increase, option: false, shift: false, multipliers: multipliers),
            5
        )
        XCTAssertEqual(
            StepMath.delta(base: 5, direction: .increase, option: true, shift: false, multipliers: multipliers),
            2.5
        )
        XCTAssertEqual(
            StepMath.delta(base: 5, direction: .decrease, option: false, shift: true, multipliers: multipliers),
            -10
        )
        XCTAssertEqual(
            StepMath.delta(base: 0.1, direction: .increase, option: true, shift: true, multipliers: multipliers),
            0.1,
            accuracy: 0.000_001
        )
    }

    func testReadoutMatchesTheHUDExample() {
        XCTAssertEqual(StepMath.readout(displayName: "Shadows", delta: 5), "Shadows +5")
        XCTAssertEqual(StepMath.readout(displayName: "Shadows", delta: 2.5), "Shadows +2.5")
        XCTAssertEqual(StepMath.readout(displayName: "Exposure", delta: -0.05), "Exposure -0.05")
        XCTAssertEqual(StepMath.formatWire(0.1), "0.1")
        XCTAssertEqual(StepMath.formatWire(-5), "-5")
    }

    func testDefaultMapDecisions() throws {
        let map = try Keymap.loadDefault()
        XCTAssertEqual(map.name, "LR Keys Default")
        XCTAssertEqual(map.port, 58421)
        XCTAssertTrue(map.issues().isEmpty, map.issues().joined(separator: ", "))
        XCTAssertEqual(map.bindings.filter { $0.kind == .adjust }.count, 18)
        XCTAssertEqual(map.bindings.filter { $0.kind != .adjust }.count, 5)

        let shadows = map.decide(keyCode: 1, option: false, shift: false, command: false, control: false, textField: false)
        guard case let .fire(_, command, readout) = shadows else {
            return XCTFail("expected shadows increase, got \(shadows)")
        }
        XCTAssertEqual(command, .inc(parameter: "Shadows2012", delta: 5))
        XCTAssertEqual(readout, "Shadows +5")
        XCTAssertEqual(WireCommand.encode(command), "inc Shadows2012 5")

        let fine = map.decide(keyCode: 1, option: true, shift: false, command: false, control: false, textField: false)
        guard case let .fire(_, fineCommand, fineReadout) = fine else {
            return XCTFail("expected fine shadows")
        }
        XCTAssertEqual(fineCommand, .inc(parameter: "Shadows2012", delta: 2.5))
        XCTAssertEqual(fineReadout, "Shadows +2.5")

        let passed = map.decide(keyCode: 1, option: false, shift: false, command: true, control: false, textField: false)
        XCTAssertEqual(passed, .pass)
        let text = map.decide(keyCode: 1, option: false, shift: false, command: false, control: false, textField: true)
        XCTAssertEqual(text, .pass)
        let unmapped = map.decide(keyCode: 0x31, option: false, shift: false, command: false, control: false, textField: false)
        XCTAssertEqual(unmapped, .pass)

        let blocked = map.decide(
            keyCode: 1,
            option: false,
            shift: false,
            command: false,
            control: false,
            textField: false,
            unsupported: ["Shadows2012"]
        )
        XCTAssertEqual(blocked, .unsupported("Shadows"))
    }

    func testConflictsAndStoreRoundTrip() throws {
        var map = try Keymap.loadDefault()
        map.bindings.append(map.bindings[7])
        XCTAssertFalse(map.conflicts().isEmpty)
        XCTAssertTrue(map.issues().contains { $0.hasPrefix("Conflict on s") })

        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try KeymapStore.save(map, directory: directory)
        let loaded = try KeymapStore.load(directory: directory)
        XCTAssertEqual(loaded.bindings.count, map.bindings.count)
        let port = try String(contentsOf: directory.appendingPathComponent("port.txt"), encoding: .utf8)
        XCTAssertEqual(port, "58421\n")
        try FileManager.default.removeItem(at: directory)
    }
}
