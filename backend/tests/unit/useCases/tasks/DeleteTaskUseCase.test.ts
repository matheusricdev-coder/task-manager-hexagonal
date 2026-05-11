import { DeleteTaskUseCase } from "../../../../src/application/useCases/tasks/DeleteTaskUseCase";
import { TaskNotFoundException } from "../../../../src/domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../../src/domain/errors/UnauthorizedTaskAccessException";
import { buildTask, makeTaskRepositoryMock } from "../../../helpers/mocks";

describe("DeleteTaskUseCase", () => {
  it("deletes a task owned by the user", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new DeleteTaskUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "user-1" }));
    taskRepository.delete.mockResolvedValue();

    await useCase.execute({ taskId: "task-1", userId: "user-1" });

    expect(taskRepository.delete).toHaveBeenCalledWith("task-1");
  });

  it("throws TaskNotFoundException when task does not exist", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new DeleteTaskUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ taskId: "missing", userId: "user-1" })
    ).rejects.toBeInstanceOf(TaskNotFoundException);
    expect(taskRepository.delete).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedTaskAccessException when user is not the owner", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new DeleteTaskUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "user-1" }));

    await expect(
      useCase.execute({ taskId: "task-1", userId: "user-2" })
    ).rejects.toBeInstanceOf(UnauthorizedTaskAccessException);
    expect(taskRepository.delete).not.toHaveBeenCalled();
  });
});
