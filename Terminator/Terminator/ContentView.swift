import SwiftUI

struct ContentView: View {
    @StateObject private var taskStore = TaskStore()
    @StateObject private var terminalManager = TerminalManager()

    var body: some View {
        HSplitView {
            TaskListView(taskStore: taskStore, terminalManager: terminalManager)
                .frame(minWidth: 220, idealWidth: 280, maxWidth: 400)

            TerminalPanelView(terminalManager: terminalManager)
                .frame(minWidth: 400)
        }
        .frame(minWidth: 700, minHeight: 400)
        .onAppear {
            // Start with one default terminal
            terminalManager.createTerminal()
        }
    }
}
