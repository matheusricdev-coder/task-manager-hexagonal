import { StartTaskTimerUseCase } from "../../../../src/application/useCases/tasks/StartTaskTimerUseCase";
import { TaskNotFoundException } from "../../../../src/domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../../src/domain/errors/UnauthorizedTaskAccessException";
import { buildTask, makeTaskRepositoryMock } from "../../../helpers/mocks";

describe("StartTaskTimerUseCase", () => {
  const now = new Date("2026-05-11T10:00:00Z");

  it("starts the timer and promotes PENDING task to IN_PROGRESS", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StartTaskTimerUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(
      buildTask({ status: "PENDING", timerStartedAt: null })
    );
    taskRepository.update.mockResolvedValue(buildTask());

    await useCase.execute({ taskId: "task-1", userId: "user-1", now });

    expect(taskRepository.update).toHaveBeenCalledWith("task-1", {
      timerStartedAt: now,
      status: "IN_PROGRESS",
    });
  });

  it("does not promote DONE tasks (preserves user intent)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StartTaskTimerUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(
      buildTask({ status: "DONE", timerStartedAt: null })
    );
    taskRepository.update.mockResolvedValue(buildTask());

    await useCase.execute({ taskId: "task-1", userId: "user-1", now });

    expect(taskRepository.update).toHaveBeenCalledWith("task-1", {
      timerStartedAt: now,
      status: "DONE",
    });
  });

  it("does not change status when already IN_PROGRESS (idempotent on status)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StartTaskTimerUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(
      buildTask({ status: "IN_PROGRESS", timerStartedAt: null })
    );
    taskRepository.update.mockResolvedValue(buildTask());

    await useCase.execute({ taskId: "task-1", userId: "user-1", now });

    expect(taskRepository.update.mock.calls[0][1].status).toBe("IN_PROGRESS");
  });

  it("is idempotent when timer is already running (no repository write)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StartTaskTimerUseCase(taskRepository);
    const running = buildTask({
      status: "IN_PROGRESS",
      timerStartedAt: new Date("2026-05-11T09:00:00Z"),
    });
    taskRepository.findById.mockResolvedValue(running);

    const result = await useCase.execute({
      taskId: running.id,
      userId: "user-1",
      now,
    });

    expect(result).toBe(running);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("defaults `now` to the current time when not provided", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StartTaskTimerUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(
      buildTask({ status: "PENDING", timerStartedAt: null })
    );
    taskRepository.update.mockResolvedValue(buildTask());

    const before = Date.now();
    await useCase.execute({ taskId: "task-1", userId: "user-1" });
    const after = Date.now();

    const used = taskRepository.update.mock.calls[0][1].timerStartedAt as Date;
    expect(used).toBeInstanceOf(Date);
    expect(used.getTime()).toBeGreaterThanOrEqual(before);
    expect(used.getTime()).toBeLessThanOrEqual(after);
  });

  it("throws TaskNotFoundException when task does not exist", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StartTaskTimerUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ taskId: "x", userId: "user-1" })
    ).rejects.toBeInstanceOf(TaskNotFoundException);
  });

  it("throws UnauthorizedTaskAccessException for non-owner (never starts foreign timers)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StartTaskTimerUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "user-1" }));
    await expect(
      useCase.execute({ taskId: "task-1", userId: "user-2" })
    ).rejects.toBeInstanceOf(UnauthorizedTaskAccessException);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });
});
