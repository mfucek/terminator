import SwiftUI

struct TaskListView: View {
    @ObservedObject var taskStore: TaskStore
    @ObservedObject var terminalManager: TerminalManager

    @State private var showAddSheet = false
    @State private var editingTask: TaskItem? = nil
    @State private var newTitle = ""
    @State private var newContent = ""

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Tasks")
                    .font(.headline)
                Spacer()
                Button {
                    newTitle = ""
                    newContent = ""
                    showAddSheet = true
                } label: {
                    Image(systemName: "plus")
                }
                .buttonStyle(.borderless)
                .keyboardShortcut("t", modifiers: .command)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            Divider()

            // Task list
            if taskStore.tasks.isEmpty {
                VStack(spacing: 8) {
                    Spacer()
                    Image(systemName: "tray")
                        .font(.largeTitle)
                        .foregroundStyle(.tertiary)
                    Text("No tasks yet")
                        .foregroundStyle(.secondary)
                    Text("Click + to add a command")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(taskStore.tasks) { task in
                            TaskRowView(
                                task: task,
                                sessions: terminalManager.sessions,
                                onSend: { sessionId in
                                    sendTask(task, to: sessionId)
                                },
                                onEdit: {
                                    newTitle = task.title
                                    newContent = task.content
                                    editingTask = task
                                },
                                onDelete: {
                                    taskStore.deleteTask(id: task.id)
                                }
                            )
                        }
                    }
                    .padding(8)
                }
            }
        }
        .frame(minWidth: 220)
        .sheet(isPresented: $showAddSheet) {
            taskFormSheet(title: "New Task", buttonLabel: "Add") {
                taskStore.addTask(title: newTitle, content: newContent)
                showAddSheet = false
            }
        }
        .sheet(item: $editingTask) { task in
            taskFormSheet(title: "Edit Task", buttonLabel: "Save") {
                taskStore.updateTask(id: task.id, title: newTitle, content: newContent)
                editingTask = nil
            }
        }
    }

    private func sendTask(_ task: TaskItem, to sessionId: UUID?) {
        if let sessionId = sessionId {
            terminalManager.sendToTerminal(sessionId: sessionId, text: task.content)
        } else {
            if let session = terminalManager.createTerminal() {
                // Delay slightly to let terminal process start
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    terminalManager.sendToTerminal(sessionId: session.id, text: task.content)
                }
            }
        }
    }

    private func taskFormSheet(title: String, buttonLabel: String, action: @escaping () -> Void) -> some View {
        VStack(spacing: 16) {
            Text(title)
                .font(.headline)

            TextField("Title", text: $newTitle)
                .textFieldStyle(.roundedBorder)

            VStack(alignment: .leading, spacing: 4) {
                Text("Command")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextEditor(text: $newContent)
                    .font(.system(.body, design: .monospaced))
                    .frame(minHeight: 80)
                    .border(Color.secondary.opacity(0.3))
            }

            HStack {
                Button("Cancel") {
                    showAddSheet = false
                    editingTask = nil
                }
                .keyboardShortcut(.cancelAction)

                Spacer()

                Button(buttonLabel) {
                    action()
                }
                .keyboardShortcut(.defaultAction)
                .disabled(newTitle.isEmpty || newContent.isEmpty)
            }
        }
        .padding(20)
        .frame(width: 400)
    }
}
