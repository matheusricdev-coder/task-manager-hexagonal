const API_BASE = "/api";

const TOKEN_KEY = "task-manager.token";
const USER_KEY = "task-manager.user";

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

export const userStorage = {
  get: <T = unknown>(): T | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  set: (user: unknown): void =>
    localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: (): void => localStorage.removeItem(USER_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = tokenStorage.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } }).error;
    throw new ApiError(
      response.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? response.statusText,
      err?.details
    );
  }

  return data as T;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  timeSpentSeconds: number;
  timerStartedAt: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedTasks {
  data: Task[];
  pagination: PaginationMeta;
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export const api = {
  register: (data: { email: string; name: string; password: string }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => request<User>("/auth/me"),
  listTasks: (filters?: {
    status?: string;
    priority?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
    const qs = params.toString();
    return request<PaginatedTasks>(`/tasks${qs ? `?${qs}` : ""}`);
  },
  createTask: (data: CreateTaskPayload) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createTasksBulk: (tasks: CreateTaskPayload[]) =>
    request<{ created: number }>("/tasks", {
      method: "POST",
      body: JSON.stringify({ tasks }),
    }),
  updateTask: (id: string, data: UpdateTaskPayload) =>
    request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTask: (id: string) =>
    request<void>(`/tasks/${id}`, { method: "DELETE" }),
  startTimer: (id: string) =>
    request<Task>(`/tasks/${id}/timer/start`, { method: "POST" }),
  stopTimer: (id: string) =>
    request<Task>(`/tasks/${id}/timer/stop`, { method: "POST" }),
};
