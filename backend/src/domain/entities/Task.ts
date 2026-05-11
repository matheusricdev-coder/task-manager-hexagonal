export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  timeSpentSeconds: number;
  timerStartedAt: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
