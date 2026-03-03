import SwiftUI

struct TaskRowView: View {
    let task: TaskItem
    let sessions: [TerminalSession]
    let onSend: (UUID?) -> Void  // nil = create new terminal first
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var isHovering = false
    @State private var showPopover = false

    var body: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)
                Text(task.content.trimmingCharacters(in: .whitespacesAndNewlines))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if isHovering {
                HStack(spacing: 4) {
                    Button {
                        onEdit()
                    } label: {
                        Image(systemName: "pencil")
                            .font(.caption)
                    }
                    .buttonStyle(.borderless)

                    Button {
                        showPopover = true
                    } label: {
                        Image(systemName: "paperplane.fill")
                            .font(.caption)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .popover(isPresented: $showPopover, arrowEdge: .trailing) {
                        terminalPicker
                    }

                    Button {
                        onDelete()
                    } label: {
                        Image(systemName: "trash")
                            .font(.caption)
                    }
                    .buttonStyle(.borderless)
                    .foregroundStyle(.red)
                }
                .transition(.opacity)
            }
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .background(isHovering ? Color.primary.opacity(0.05) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.15)) {
                isHovering = hovering
            }
        }
    }

    private var terminalPicker: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Send to...")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 12)
                .padding(.top, 8)
                .padding(.bottom, 4)

            ForEach(sessions) { session in
                Button {
                    showPopover = false
                    onSend(session.id)
                } label: {
                    HStack {
                        Image(systemName: "terminal")
                        Text(session.title)
                        Spacer()
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.clear)
                .onHover { hovering in
                    // hover styling handled by SwiftUI
                }
            }

            Divider()
                .padding(.vertical, 4)

            Button {
                showPopover = false
                onSend(nil)
            } label: {
                HStack {
                    Image(systemName: "plus")
                    Text("New Terminal")
                    Spacer()
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
        }
        .padding(.vertical, 4)
        .frame(minWidth: 180)
    }
}
