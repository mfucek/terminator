export type TaskStatus = 'todo' | 'doing' | 'done';

export interface TaskData {
  id: string;
  text: string;
  status: TaskStatus;
  createdAt: number;
  sentAt?: number;
  completedAt?: number;
}
