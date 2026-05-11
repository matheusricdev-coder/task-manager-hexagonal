import { GetTaskByIdUseCase } from "../../../../src/application/useCases/tasks/GetTaskByIdUseCase";
import { TaskNotFoundException } from "../../../../src/domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../../src/domain/errors/UnauthorizedTaskAccessException";
import { buildTask, makeTaskRepositoryMock } from "../../../helpers/mocks";

describe("GetTaskByIdUseCase", () => {
  it("returns task when user is the owner", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new GetTaskByIdUseCase(taskRepository);
    const task = buildTask({ userId: "user-1" });
    taskRepository.findById.mockResolvedValue(task);

    const result = await useCase.execute({ taskId: task.id, userId: "user-1" });

    expect(result).toBe(task);
  });

  it("throws TaskNotFoundException when task does not exist", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new GetTaskByIdUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ taskId: "missing", userId: "user-1" })
    ).rejects.toBeInstanceOf(TaskNotFoundException);
  });

  it("throws UnauthorizedTaskAccessException when user is not the owner", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new GetTaskByIdUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "user-1" }));

    await expect(
      useCase.execute({ taskId: "task-1", userId: "user-2" })
    ).rejects.toBeInstanceOf(UnauthorizedTaskAccessException);
  });
});
