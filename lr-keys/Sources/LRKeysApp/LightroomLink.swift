#if os(macOS)
import Foundation

/// Client side of the one localhost socket. The plugin listens; this connects,
/// writes commands, and reads replies including compat blocks.
final class LightroomLink {
    private let client = LineClient()
    private let queue = DispatchQueue(label: "lrkeys.link")
    private let reader = DispatchQueue(label: "lrkeys.link.read")
    private var stopped = false
    private var port: UInt16
    private var collecting = false
    private var compatLines: [String] = []

    var onStatus: ((String, Bool) -> Void)?
    var onReadout: ((String) -> Void)?
    var onReport: ((CompatReport) -> Void)?

    init(port: UInt16) {
        self.port = port
    }

    func start() {
        reader.async { [weak self] in
            self?.readLoop()
        }
        queue.async { [weak self] in
            self?.keepalive()
        }
    }

    func stop() {
        stopped = true
        client.close()
    }

    func updatePort(_ port: UInt16) {
        queue.async {
            guard port != self.port else { return }
            self.port = port
            self.client.close()
        }
    }

    func send(_ command: WireCommand) {
        let line = WireCommand.encode(command)
        queue.async {
            do {
                try self.ensureConnected()
                try self.client.sendLine(line)
                self.publish(status: "Connected", connected: true)
            } catch {
                self.client.close()
                self.publish(status: "Not connected", connected: false)
                if command != .ping(token: "1") && command != .probe {
                    DispatchQueue.main.async {
                        self.onReadout?("Not connected")
                    }
                }
            }
        }
    }

    func probe() {
        send(.probe)
    }

    private func keepalive() {
        if stopped { return }
        if !client.isConnected {
            try? client.connect(port: port, timeout: 0.3)
        }
        if client.isConnected {
            try? client.sendLine("ping 1")
        }
        queue.asyncAfter(deadline: .now() + 1) { [weak self] in
            self?.keepalive()
        }
    }

    private func ensureConnected() throws {
        if client.isConnected { return }
        try client.connect(port: port, timeout: 0.4)
    }

    private func readLoop() {
        while !stopped {
            guard client.isConnected else {
                Thread.sleep(forTimeInterval: 0.2)
                continue
            }
            do {
                let line = try client.receiveLine(timeout: 0.5)
                DispatchQueue.main.async { [weak self] in
                    self?.consume(line)
                }
            } catch SocketError.timeout {
                continue
            } catch {
                client.close()
                publish(status: "Waiting for Lightroom", connected: false)
            }
        }
    }

    private func consume(_ line: String) {
        if line == "compat begin" {
            collecting = true
            compatLines = [line]
            return
        }
        if collecting {
            compatLines.append(line)
            if line == "compat end", var report = CompatReport.parse(lines: compatLines) {
                collecting = false
                if report.probedAt.isEmpty {
                    report.probedAt = ISO8601DateFormatter().string(from: Date())
                }
                onReport?(report)
                publish(status: "Connected", connected: true)
            }
            return
        }
        guard let reply = WireReply.parse(line) else { return }
        if case let .err(message) = reply {
            onReadout?(message.isEmpty ? "Lightroom error" : message)
        }
        publish(status: "Connected", connected: true)
    }

    private func publish(status: String, connected: Bool) {
        DispatchQueue.main.async {
            self.onStatus?(status, connected)
        }
    }
}
#endif
