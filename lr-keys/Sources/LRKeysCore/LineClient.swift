import Foundation
#if canImport(Darwin)
import Darwin
#elseif canImport(Glibc)
import Glibc
#endif

public enum SocketError: Error, Equatable {
    case connectFailed(Int32)
    case sendFailed(Int32)
    case receiveFailed(Int32)
    case notConnected
    case closed
    case timeout
    case badAddress
}

/// A small localhost TCP client. Writes and reads may run on different threads.
/// `sendLine` holds a lock so a line is not torn and `close` cannot reuse the
/// descriptor mid-write. The reader must not call `receiveLine` concurrently
/// with itself.
public final class LineClient {
    private var fd: Int32 = -1
    private let lock = NSLock()
    private var incoming = Data()

    public var isConnected: Bool {
        lock.lock()
        defer { lock.unlock() }
        return fd >= 0
    }

    public func connect(host: String = "127.0.0.1", port: UInt16, timeout: TimeInterval = 2) throws {
        close()
        let socketFD = socket(AF_INET, streamSocketType, 0)
        if socketFD < 0 {
            throw SocketError.connectFailed(errno)
        }
        var one: Int32 = 1
        _ = setsockopt(socketFD, SOL_SOCKET, SO_REUSEADDR, &one, socklen_t(MemoryLayout<Int32>.size))
        _ = setsockopt(socketFD, tcpProtocol, TCP_NODELAY, &one, socklen_t(MemoryLayout<Int32>.size))
        #if canImport(Darwin)
        var noSignal: Int32 = 1
        _ = setsockopt(socketFD, SOL_SOCKET, SO_NOSIGPIPE, &noSignal, socklen_t(MemoryLayout<Int32>.size))
        #endif
        try setTimeout(socketFD, timeout, option: SO_SNDTIMEO)
        try setTimeout(socketFD, timeout, option: SO_RCVTIMEO)

        var address = sockaddr_in()
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = port.bigEndian
        if host.withCString({ inet_pton(AF_INET, $0, &address.sin_addr) }) != 1 {
            _ = closeDescriptor(socketFD)
            throw SocketError.badAddress
        }
        let connected = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { raw in
                systemConnect(socketFD, raw, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        if connected != 0 {
            let error = errno
            _ = closeDescriptor(socketFD)
            throw SocketError.connectFailed(error)
        }
        lock.lock()
        fd = socketFD
        incoming.removeAll(keepingCapacity: false)
        lock.unlock()
    }

    public func sendLine(_ line: String) throws {
        let bytes = Array((line + "\n").utf8)
        lock.lock()
        defer { lock.unlock() }
        guard fd >= 0 else {
            throw SocketError.notConnected
        }
        var offset = 0
        while offset < bytes.count {
            let sent = bytes.withUnsafeBytes { raw -> Int in
                guard let base = raw.baseAddress else { return -1 }
                return systemSend(fd, base.advanced(by: offset), bytes.count - offset)
            }
            if sent < 0 {
                let error = errno
                if error == EINTR {
                    continue
                }
                throw SocketError.sendFailed(error)
            }
            if sent == 0 {
                throw SocketError.closed
            }
            offset += sent
        }
    }

    public func receiveLine(timeout: TimeInterval = 2) throws -> String {
        let current = lockedDescriptor()
        guard current >= 0 else {
            throw SocketError.notConnected
        }
        try setTimeout(current, timeout, option: SO_RCVTIMEO)
        while true {
            if let newline = incoming.firstIndex(of: 0x0A) {
                let payload = incoming.prefix(upTo: newline)
                incoming.removeSubrange(incoming.startIndex...newline)
                var text = String(data: payload, encoding: .utf8) ?? ""
                if text.hasSuffix("\r") {
                    text.removeLast()
                }
                return text
            }
            var buffer = [UInt8](repeating: 0, count: 2048)
            let count = buffer.withUnsafeMutableBytes { raw -> Int in
                guard let base = raw.baseAddress else { return -1 }
                return systemRecv(current, base, raw.count)
            }
            if count == 0 {
                throw SocketError.closed
            }
            if count < 0 {
                let error = errno
                if error == EINTR {
                    continue
                }
                if error == EAGAIN || error == EWOULDBLOCK || error == ETIMEDOUT {
                    throw SocketError.timeout
                }
                throw SocketError.receiveFailed(error)
            }
            incoming.append(buffer, count: count)
        }
    }

    public func close() {
        lock.lock()
        let current = fd
        fd = -1
        incoming.removeAll(keepingCapacity: false)
        lock.unlock()
        if current >= 0 {
            _ = shutdownDescriptor(current)
            _ = closeDescriptor(current)
        }
    }

    private func lockedDescriptor() -> Int32 {
        lock.lock()
        defer { lock.unlock() }
        return fd
    }

    private func setTimeout(_ descriptor: Int32, _ timeout: TimeInterval, option: Int32) throws {
        var time = timeval()
        let seconds = timeout > 0 ? timeout : 0.001
        time.tv_sec = time_t(seconds)
        time.tv_usec = suseconds_t((seconds - Double(Int(seconds))) * 1_000_000)
        let result = withUnsafePointer(to: &time) { pointer in
            setsockopt(descriptor, SOL_SOCKET, option, pointer, socklen_t(MemoryLayout<timeval>.size))
        }
        if result != 0 {
            throw SocketError.connectFailed(errno)
        }
    }
}

#if canImport(Darwin)
private let streamSocketType: Int32 = SOCK_STREAM
private let tcpProtocol: Int32 = IPPROTO_TCP
#else
private let streamSocketType: Int32 = Int32(SOCK_STREAM.rawValue)
private let tcpProtocol: Int32 = Int32(IPPROTO_TCP)
#endif

#if canImport(Darwin)
private func systemConnect(_ fd: Int32, _ address: UnsafePointer<sockaddr>, _ length: socklen_t) -> Int32 {
    Darwin.connect(fd, address, length)
}
private func systemSend(_ fd: Int32, _ buffer: UnsafeRawPointer, _ count: Int) -> Int {
    Darwin.send(fd, buffer, count, 0)
}
private func systemRecv(_ fd: Int32, _ buffer: UnsafeMutableRawPointer, _ count: Int) -> Int {
    Darwin.recv(fd, buffer, count, 0)
}
private func closeDescriptor(_ fd: Int32) -> Int32 {
    Darwin.close(fd)
}
private func shutdownDescriptor(_ fd: Int32) -> Int32 {
    Darwin.shutdown(fd, SHUT_RDWR)
}
#else
private func systemConnect(_ fd: Int32, _ address: UnsafePointer<sockaddr>, _ length: socklen_t) -> Int32 {
    Glibc.connect(fd, address, length)
}
private func systemSend(_ fd: Int32, _ buffer: UnsafeRawPointer, _ count: Int) -> Int {
    Glibc.send(fd, buffer, count, Int32(MSG_NOSIGNAL))
}
private func systemRecv(_ fd: Int32, _ buffer: UnsafeMutableRawPointer, _ count: Int) -> Int {
    Glibc.recv(fd, buffer, count, 0)
}
private func closeDescriptor(_ fd: Int32) -> Int32 {
    Glibc.close(fd)
}
private func shutdownDescriptor(_ fd: Int32) -> Int32 {
    Glibc.shutdown(fd, Int32(SHUT_RDWR))
}
#endif

/// Localhost stand-in for the Lightroom plugin socket. Tests and the latency
/// tool can point a client at it. One accepted connection, line in, line out.
public final class LineServer {
    private var listenFD: Int32 = -1
    private(set) var port: UInt16 = 0

    public func start() throws -> UInt16 {
        let socketFD = socket(AF_INET, streamSocketType, 0)
        if socketFD < 0 {
            throw SocketError.connectFailed(errno)
        }
        var one: Int32 = 1
        _ = setsockopt(socketFD, SOL_SOCKET, SO_REUSEADDR, &one, socklen_t(MemoryLayout<Int32>.size))
        var address = sockaddr_in()
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = 0
        address.sin_addr.s_addr = inet_addr("127.0.0.1")
        let bound = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { raw in
                bind(socketFD, raw, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        if bound != 0 {
            let error = errno
            _ = closeDescriptor(socketFD)
            throw SocketError.connectFailed(error)
        }
        if listen(socketFD, 1) != 0 {
            let error = errno
            _ = closeDescriptor(socketFD)
            throw SocketError.connectFailed(error)
        }
        var boundAddress = sockaddr_in()
        var length = socklen_t(MemoryLayout<sockaddr_in>.size)
        let named = withUnsafeMutablePointer(to: &boundAddress) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { raw in
                getsockname(socketFD, raw, &length)
            }
        }
        if named != 0 {
            let error = errno
            _ = closeDescriptor(socketFD)
            throw SocketError.connectFailed(error)
        }
        listenFD = socketFD
        port = UInt16(bigEndian: boundAddress.sin_port)
        return port
    }

    /// Reads lines until the client closes. `handler` returns the reply line
    /// without a newline. Pass an empty string to stay quiet.
    public func serve(handler: (String) -> String) throws {
        var timeout = timeval()
        timeout.tv_sec = 5
        timeout.tv_usec = 0
        _ = withUnsafePointer(to: &timeout) { pointer in
            setsockopt(listenFD, SOL_SOCKET, SO_RCVTIMEO, pointer, socklen_t(MemoryLayout<timeval>.size))
        }
        var clientAddress = sockaddr_in()
        var length = socklen_t(MemoryLayout<sockaddr_in>.size)
        let client = withUnsafeMutablePointer(to: &clientAddress) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { raw in
                accept(listenFD, raw, &length)
            }
        }
        if client < 0 {
            throw SocketError.timeout
        }
        var one: Int32 = 1
        _ = setsockopt(client, tcpProtocol, TCP_NODELAY, &one, socklen_t(MemoryLayout<Int32>.size))
        var incoming = Data()
        var buffer = [UInt8](repeating: 0, count: 2048)
        while true {
            if let newline = incoming.firstIndex(of: 0x0A) {
                let payload = incoming.prefix(upTo: newline)
                incoming.removeSubrange(incoming.startIndex...newline)
                var text = String(data: payload, encoding: .utf8) ?? ""
                if text.hasSuffix("\r") {
                    text.removeLast()
                }
                let reply = handler(text)
                if !reply.isEmpty {
                    let bytes = Array((reply + "\n").utf8)
                    var offset = 0
                    while offset < bytes.count {
                        let sent = bytes.withUnsafeBytes { raw -> Int in
                            systemSend(client, raw.baseAddress!.advanced(by: offset), bytes.count - offset)
                        }
                        if sent <= 0 {
                            _ = closeDescriptor(client)
                            throw SocketError.sendFailed(errno)
                        }
                        offset += sent
                    }
                }
                continue
            }
            let count = buffer.withUnsafeMutableBytes { raw -> Int in
                systemRecv(client, raw.baseAddress!, raw.count)
            }
            if count <= 0 {
                break
            }
            incoming.append(buffer, count: count)
        }
        _ = closeDescriptor(client)
    }

    public func stop() {
        if listenFD >= 0 {
            _ = closeDescriptor(listenFD)
            listenFD = -1
        }
    }
}
