import { UpdateTaskUseCase } from "../../../../src/application/useCases/tasks/UpdateTaskUseCase";
import { TaskNotFoundException } from "../../../../src/domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../../src/domain/errors/UnauthorizedTaskAccessException";
import { buildTask, makeTaskRepositoryMock } from "../../../helpers/mocks";

describe("UpdateTaskUseCase", () => {
  it("updates a task owned by the user with all new fields", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new UpdateTaskUseCase(taskRepository);
    const existing = buildTask({ userId: "user-1" });
    const updated = buildTask({ title: "Updated" });
    taskRepository.findById.mockResolvedValue(existing);
    taskRepository.update.mockResolvedValue(updated);
    const due = new Date("2026-07-01T00:00:00Z");

    const result = await useCase.execute({
      taskId: existing.id,
      userId: "user-1",
      title: "Updated",
      status: "DONE",
      priority: "HIGH",
      dueDate: due,
    });

    expect(taskRepository.update).toHaveBeenCalledWith(existing.id, {
      title: "Updated",
      description: undefined,
      status: "DONE",
      priority: "HIGH",
      dueDate: due,
    });
    expect(result).toBe(updated);
  });

  it("supports partial update of title only — other fields are undefined (not reset)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new UpdateTaskUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "user-1" }));
    taskRepository.update.mockResolvedValue(buildTask());

    await useCase.execute({
      taskId: "task-1",
      userId: "user-1",
      title: "Only title",
    });

    expect(taskRepository.update).toHaveBeenCalledWith("task-1", {
      title: "Only title",
      description: undefined,
      status: undefined,
      priority: undefined,
      dueDate: undefined,
    });
  });

  it("supports clearing dueDate by passing null (semantic distinction from undefined)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new UpdateTaskUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "user-1" }));
    taskRepository.update.mockResolvedValue(buildTask());

    await useCase.execute({
      taskId: "task-1",
      userId: "user-1",
      dueDate: null,
    });

    const call = taskRepository.update.mock.calls[0][1];
    expect(call.dueDate).toBeNull();
  });

  it("supports clearing description by passing null", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new UpdateTaskUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "user-1" }));
    taskRepository.update.mockResolvedValue(buildTask());

    await useCase.execute({
      taskId: "task-1",
      userId: "user-1",
      description: null,
    });

    expect(taskRepository.update.mock.calls[0][1].description).toBeNull();
  });

  it("throws TaskNotFoundException when task does not exist", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new UpdateTaskUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ taskId: "missing", userId: "user-1", title: "x" })
    ).rejects.toBeInstanceOf(TaskNotFoundException);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedTaskAccessException when user is not the owner", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new UpdateTaskUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "user-1" }));

    await expect(
      useCase.execute({ taskId: "task-1", userId: "user-2", title: "x" })
    ).rejects.toBeInstanceOf(UnauthorizedTaskAccessException);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("never persists changes when ownership check fails (no side-effects)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new UpdateTaskUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "owner" }));

    await expect(
      useCase.execute({
        taskId: "t",
        userId: "intruder",
        title: "hijacked",
        status: "DONE",
      })
    ).rejects.toBeDefined();

    expect(taskRepository.update).not.toHaveBeenCalled();
  });
});
