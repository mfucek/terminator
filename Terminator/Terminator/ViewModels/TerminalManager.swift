import Foundation
import SwiftTerm

class TerminalManager: ObservableObject {
    @Published var sessions: [TerminalSession] = []
    private let maxTerminals = 5
    private var terminalCounter = 0

    @discardableResult
    func createTerminal() -> TerminalSession? {
        guard sessions.count < maxTerminals else { return nil }
        terminalCounter += 1
        let session = TerminalSession(title: "Terminal \(terminalCounter)")
        sessions.append(session)
        // Process is started after the view is mounted via SwiftTermView
        return session
    }

    func closeTerminal(sessionId: UUID) {
        sessions.removeAll { $0.id == sessionId }
    }

    func sendToTerminal(sessionId: UUID, text: String) {
        guard let session = sessions.first(where: { $0.id == sessionId }) else { return }
        let bytes = Array(text.utf8)
        session.localProcessView.send(data: bytes[...])
    }
}
