import SwiftUI

struct TerminalPanelView: View {
    @ObservedObject var terminalManager: TerminalManager

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Terminals")
                    .font(.headline)
                Spacer()
                if terminalManager.sessions.count < 5 {
                    Button {
                        terminalManager.createTerminal()
                    } label: {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.borderless)
                    .keyboardShortcut("n", modifiers: .command)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            Divider()

            // Terminal grid
            if terminalManager.sessions.isEmpty {
                VStack(spacing: 8) {
                    Spacer()
                    Image(systemName: "terminal")
                        .font(.largeTitle)
                        .foregroundStyle(.tertiary)
                    Text("No terminals")
                        .foregroundStyle(.secondary)
                    Button("Open Terminal") {
                        terminalManager.createTerminal()
                    }
                    .keyboardShortcut("n", modifiers: .command)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                terminalGrid
            }
        }
    }

    @ViewBuilder
    private var terminalGrid: some View {
        let count = terminalManager.sessions.count
        let sessions = terminalManager.sessions

        GeometryReader { _ in
            switch count {
            case 1:
                terminalCell(sessions[0])
            case 2:
                HStack(spacing: 1) {
                    terminalCell(sessions[0])
                    terminalCell(sessions[1])
                }
            case 3:
                VStack(spacing: 1) {
                    HStack(spacing: 1) {
                        terminalCell(sessions[0])
                        terminalCell(sessions[1])
                    }
                    terminalCell(sessions[2])
                }
            case 4:
                VStack(spacing: 1) {
                    HStack(spacing: 1) {
                        terminalCell(sessions[0])
                        terminalCell(sessions[1])
                    }
                    HStack(spacing: 1) {
                        terminalCell(sessions[2])
                        terminalCell(sessions[3])
                    }
                }
            case 5:
                VStack(spacing: 1) {
                    HStack(spacing: 1) {
                        terminalCell(sessions[0])
                        terminalCell(sessions[1])
                        terminalCell(sessions[2])
                    }
                    HStack(spacing: 1) {
                        terminalCell(sessions[3])
                        terminalCell(sessions[4])
                    }
                }
            default:
                EmptyView()
            }
        }
    }

    private func terminalCell(_ session: TerminalSession) -> some View {
        VStack(spacing: 0) {
            // Tab header
            HStack(spacing: 6) {
                Image(systemName: "terminal")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(session.title)
                    .font(.caption)
                    .lineLimit(1)
                Spacer()
                Button {
                    terminalManager.closeTerminal(sessionId: session.id)
                } label: {
                    Image(systemName: "xmark")
                        .font(.caption2)
                }
                .buttonStyle(.borderless)
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(nsColor: .controlBackgroundColor))

            SwiftTermView(session: session)
                .onAppear {
                    session.startProcess()
                }
        }
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
        )
    }
}
