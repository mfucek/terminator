import Foundation

class TaskStore: ObservableObject {
    @Published var tasks: [TaskItem] = []

    init() {
        tasks = TaskPersistence.load()
    }

    func addTask(title: String, content: String) {
        let task = TaskItem(title: title, content: content)
        tasks.append(task)
        save()
    }

    func deleteTask(id: UUID) {
        tasks.removeAll { $0.id == id }
        save()
    }

    func updateTask(id: UUID, title: String, content: String) {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[index].title = title
        tasks[index].content = content
        save()
    }

    private func save() {
        TaskPersistence.save(tasks)
    }
}
