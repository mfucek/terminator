import Foundation
import SwiftTerm

class TerminalSession: Identifiable, ObservableObject {
    let id: UUID
    @Published var title: String
    let localProcessView: LocalProcessTerminalView

    init(id: UUID = UUID(), title: String) {
        self.id = id
        self.title = title
        self.localProcessView = LocalProcessTerminalView(frame: .zero)
    }

    func startProcess() {
        let shell = ProcessInfo.processInfo.environment["SHELL"] ?? "/bin/zsh"
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        localProcessView.startProcess(executable: shell, environment: nil, execName: "-zsh", currentDirectory: home)
    }
}
