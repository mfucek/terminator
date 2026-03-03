import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { TaskData, TaskStatus } from './types';

const STORAGE_KEY = 'terminator.tasks';

export class TaskStore {
  private tasks: TaskData[] = [];
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly state: vscode.Memento) {
    this.tasks = this.state.get<TaskData[]>(STORAGE_KEY, []);
  }

  getAllTasks(): TaskData[] {
    return [...this.tasks];
  }

  getById(id: string): TaskData | undefined {
    return this.tasks.find(t => t.id === id);
  }

  addTask(text: string): TaskData {
    const task: TaskData = {
      id: crypto.randomUUID(),
      text,
      status: 'todo',
      createdAt: Date.now(),
    };
    this.tasks.push(task);
    this.persist();
    return task;
  }

  updateStatus(id: string, status: TaskStatus): void {
    const task = this.tasks.find(t => t.id === id);
    if (!task) { return; }
    task.status = status;
    if (status === 'doing') { task.sentAt = Date.now(); }
    if (status === 'done') { task.completedAt = Date.now(); }
    this.persist();
  }

  updateText(id: string, text: string): void {
    const task = this.tasks.find(t => t.id === id);
    if (!task) { return; }
    task.text = text;
    this.persist();
  }

  deleteTask(id: string): void {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.persist();
  }

  moveTask(id: string, newStatus: TaskStatus, insertBeforeId?: string): void {
    const taskIndex = this.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) { return; }

    const [task] = this.tasks.splice(taskIndex, 1);
    task.status = newStatus;
    if (newStatus === 'doing' && !task.sentAt) { task.sentAt = Date.now(); }
    if (newStatus === 'done' && !task.completedAt) { task.completedAt = Date.now(); }
    if (newStatus === 'todo') { task.sentAt = undefined; task.completedAt = undefined; }

    if (insertBeforeId) {
      const beforeIndex = this.tasks.findIndex(t => t.id === insertBeforeId);
      if (beforeIndex !== -1) {
        this.tasks.splice(beforeIndex, 0, task);
      } else {
        this.tasks.push(task);
      }
    } else {
      // Append after the last task with the same status
      let lastIndex = -1;
      for (let i = this.tasks.length - 1; i >= 0; i--) {
        if (this.tasks[i].status === newStatus) { lastIndex = i; break; }
      }
      this.tasks.splice(lastIndex + 1, 0, task);
    }

    this.persist();
  }

  private persist(): void {
    this.state.update(STORAGE_KEY, this.tasks);
    this._onDidChange.fire();
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
