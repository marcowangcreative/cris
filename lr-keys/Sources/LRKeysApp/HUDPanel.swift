#if os(macOS)
import AppKit

final class HUDPanel {
    private let panel: NSPanel
    private let label = NSTextField(labelWithString: "")
    private var hideWork: DispatchWorkItem?

    init() {
        panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 240, height: 48),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.ignoresMouseEvents = true
        panel.hidesOnDeactivate = false
        label.font = NSFont.systemFont(ofSize: 22, weight: .semibold)
        label.textColor = .white
        label.alignment = .center
        label.drawsBackground = true
        label.backgroundColor = NSColor.black.withAlphaComponent(0.72)
        label.wantsLayer = true
        label.layer?.cornerRadius = 10
        label.lineBreakMode = .byTruncatingTail
        panel.contentView = label
    }

    func show(_ text: String) {
        DispatchQueue.main.async {
            self.label.stringValue = "  \(text)  "
            self.label.sizeToFit()
            let size = NSSize(width: max(160, self.label.frame.width + 28), height: self.label.frame.height + 18)
            guard let screen = NSScreen.main ?? NSScreen.screens.first else { return }
            let visible = screen.visibleFrame
            let origin = NSPoint(x: visible.midX - size.width / 2, y: visible.minY + 72)
            self.panel.setFrame(NSRect(origin: origin, size: size), display: true)
            self.panel.orderFrontRegardless()
            self.hideWork?.cancel()
            let work = DispatchWorkItem { [weak self] in
                self?.panel.orderOut(nil)
            }
            self.hideWork = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8, execute: work)
        }
    }
}
#endif
