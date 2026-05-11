import { TaskRepository } from "../../src/application/ports/repositories/TaskRepository";
import { UserRepository } from "../../src/application/ports/repositories/UserRepository";
import { HashService } from "../../src/application/ports/services/HashService";
import { TokenService } from "../../src/application/ports/services/TokenService";
import { Task } from "../../src/domain/entities/Task";
import { User } from "../../src/domain/entities/User";

export const makeUserRepositoryMock = (): jest.Mocked<UserRepository> => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
});

export const makeTaskRepositoryMock = (): jest.Mocked<TaskRepository> => ({
  create: jest.fn(),
  createMany: jest.fn(),
  findById: jest.fn(),
  findManyByUser: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

export const makeHashServiceMock = (): jest.Mocked<HashService> => ({
  hash: jest.fn(),
  compare: jest.fn(),
});

export const makeTokenServiceMock = (): jest.Mocked<TokenService> => ({
  sign: jest.fn(),
  verify: jest.fn(),
});

export const buildUser = (overrides: Partial<User> = {}): User => ({
  id: "user-1",
  email: "alice@example.com",
  name: "Alice",
  password: "hashed-password",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

export const buildTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Write tests",
  description: null,
  status: "PENDING",
  priority: "MEDIUM",
  dueDate: null,
  timeSpentSeconds: 0,
  timerStartedAt: null,
  userId: "user-1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});
