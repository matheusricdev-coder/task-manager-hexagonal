import { CreateTaskUseCase } from "../../../../src/application/useCases/tasks/CreateTaskUseCase";
import { buildTask, makeTaskRepositoryMock } from "../../../helpers/mocks";

describe("CreateTaskUseCase", () => {
  it("creates a task with default status PENDING, priority MEDIUM, and persists user ownership", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new CreateTaskUseCase(taskRepository);
    const created = buildTask({ title: "New task" });
    taskRepository.create.mockResolvedValue(created);

    const result = await useCase.execute({
      title: "New task",
      userId: "user-1",
    });

    expect(taskRepository.create).toHaveBeenCalledWith({
      title: "New task",
      description: null,
      status: "PENDING",
      priority: "MEDIUM",
      dueDate: null,
      userId: "user-1",
    });
    expect(result).toBe(created);
  });

  it("respects provided fields", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new CreateTaskUseCase(taskRepository);
    taskRepository.create.mockResolvedValue(buildTask());
    const due = new Date("2026-06-01T12:00:00Z");

    await useCase.execute({
      title: "Work",
      description: "deep work",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: due,
      userId: "user-9",
    });

    expect(taskRepository.create).toHaveBeenCalledWith({
      title: "Work",
      description: "deep work",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: due,
      userId: "user-9",
    });
  });
});
