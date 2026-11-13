#if os(macOS)
import AppKit
import SwiftUI
import UniformTypeIdentifiers

struct ShortcutEditorView: View {
    @ObservedObject var model: AppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(model.keymap.name).font(.title2)
            Text("Option multiplies the step by \(formatted(model.keymap.multipliers.option)). Shift multiplies it by \(formatted(model.keymap.multipliers.shift)). Both together multiply.")
                .font(.callout)
                .foregroundColor(.secondary)
            if !model.keymap.conflicts().isEmpty {
                Text(model.keymap.conflicts().map { "Conflict on \($0.label)" }.joined(separator: "  ·  "))
                    .foregroundColor(.red)
            }
            HStack {
                multiplierField("Option", value: model.keymap.multipliers.option) { model.setMultiplier(option: $0) }
                multiplierField("Shift", value: model.keymap.multipliers.shift) { model.setMultiplier(shift: $0) }
            }
            List {
                ForEach(model.keymap.bindings) { binding in
                    HStack {
                        Button(model.recordingID == binding.id ? "Press a key…" : display(binding.key)) {
                            model.beginRecording(binding.id)
                        }
                        .frame(width: 110, alignment: .leading)
                        Text(model.keymap.steps[binding.parameter]?.displayName ?? DevelopCatalog.displayName(for: binding.parameter))
                        if binding.kind == .adjust, let direction = binding.direction {
                            Text(direction.rawValue).foregroundColor(.secondary)
                        } else {
                            Text(binding.kind.rawValue).foregroundColor(.secondary)
                        }
                        if model.isUnsupported(binding) {
                            Text("Unsupported").foregroundColor(.orange)
                        }
                        Spacer()
                        if binding.kind == .adjust, let step = model.keymap.steps[binding.parameter] {
                            Text("step \(formatted(step.base))").foregroundColor(.secondary)
                        }
                        Button("Remove") { model.deleteBinding(binding.id) }
                    }
                    .opacity(model.isUnsupported(binding) ? 0.45 : 1)
                }
            }
            stepEditors
            HStack {
                Button("Import Power Keys Map…", action: importMap)
                Button("Reset to Default") { model.resetDefault() }
                Spacer()
                Text(model.statusText).foregroundColor(.secondary)
            }
        }
        .padding(16)
        .frame(minWidth: 680, minHeight: 560)
    }

    private var stepEditors: some View {
        let parameters = model.keymap.steps.keys.sorted()
        return VStack(alignment: .leading, spacing: 6) {
            Text("Step sizes").font(.headline)
            ForEach(parameters, id: \.self) { parameter in
                if let step = model.keymap.steps[parameter] {
                    HStack {
                        Text(step.displayName).frame(width: 140, alignment: .leading)
                        TextField(
                            "step",
                            value: Binding(
                                get: { step.base },
                                set: { model.setStep(parameter: parameter, base: $0) }
                            ),
                            format: .number
                        )
                        .frame(width: 80)
                    }
                }
            }
        }
    }

    private func multiplierField(_ title: String, value: Double, apply: @escaping (Double) -> Void) -> some View {
        HStack {
            Text(title)
            TextField(
                title,
                value: Binding(get: { value }, set: apply),
                format: .number
            )
            .frame(width: 70)
        }
    }

    private func display(_ key: String) -> String {
        if key.isEmpty { return "Set key" }
        if key.count == 1, key.first?.isLetter == true { return key.uppercased() }
        return key
    }

    private func formatted(_ value: Double) -> String {
        StepMath.formatWire(value)
    }

    private func importMap() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.json]
        panel.allowsMultipleSelection = false
        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            model.importFile(at: url)
        }
    }
}

struct CompatListView: View {
    @ObservedObject var model: AppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let report = model.report {
                Text("Lightroom \(report.lightroomVersion)   ·   SDK \(report.sdkVersion)")
                    .font(.headline)
                Text("\(report.passCount) passed, \(report.failCount) failed, \(report.skipCount) skipped")
                if !report.probedAt.isEmpty {
                    Text(report.probedAt).foregroundColor(.secondary)
                }
                List(ordered(report.entries)) { entry in
                    HStack(alignment: .firstTextBaseline) {
                        Text(title(entry.status))
                            .foregroundColor(color(entry.status))
                            .frame(width: 48, alignment: .leading)
                        Text(entry.name).frame(width: 210, alignment: .leading)
                        Text(entry.scope).foregroundColor(.secondary).frame(width: 80, alignment: .leading)
                        Text(entry.summary).foregroundColor(.secondary)
                    }
                }
            } else {
                Text(model.compatNote.isEmpty ? "Checking…" : model.compatNote)
                    .padding()
            }
            Text("Open a photo in Develop first. A skip means the slider was not checked, not that it is broken. Failures are greyed out in the shortcut editor.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(16)
        .frame(minWidth: 700, minHeight: 460)
    }

    private func ordered(_ entries: [CompatEntry]) -> [CompatEntry] {
        let rank = ["fail": 0, "skip": 1, "pass": 2]
        return entries.sorted {
            (rank[$0.status] ?? 9, $0.scope, $0.name) < (rank[$1.status] ?? 9, $1.scope, $1.name)
        }
    }

    private func title(_ status: String) -> String {
        switch status {
        case "pass": return "Pass"
        case "fail": return "Fail"
        default: return "Skip"
        }
    }

    private func color(_ status: String) -> Color {
        switch status {
        case "pass": return .green
        case "fail": return .red
        default: return .orange
        }
    }
}
#endif
