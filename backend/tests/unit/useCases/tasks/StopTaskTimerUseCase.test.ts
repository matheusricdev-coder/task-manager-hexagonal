import { StopTaskTimerUseCase } from "../../../../src/application/useCases/tasks/StopTaskTimerUseCase";
import { TaskNotFoundException } from "../../../../src/domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../../src/domain/errors/UnauthorizedTaskAccessException";
import { buildTask, makeTaskRepositoryMock } from "../../../helpers/mocks";

describe("StopTaskTimerUseCase", () => {
  it("accumulates elapsed seconds and clears the timer", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StopTaskTimerUseCase(taskRepository);
    const startedAt = new Date("2026-05-11T10:00:00Z");
    const now = new Date("2026-05-11T10:05:30Z");
    taskRepository.findById.mockResolvedValue(
      buildTask({ timerStartedAt: startedAt, timeSpentSeconds: 120 })
    );
    taskRepository.update.mockResolvedValue(buildTask());

    await useCase.execute({ taskId: "task-1", userId: "user-1", now });

    expect(taskRepository.update).toHaveBeenCalledWith("task-1", {
      timerStartedAt: null,
      timeSpentSeconds: 120 + 330,
    });
  });

  it("defaults `now` to current time when not provided", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StopTaskTimerUseCase(taskRepository);
    const startedAt = new Date(Date.now() - 60_000);
    taskRepository.findById.mockResolvedValue(
      buildTask({ timerStartedAt: startedAt, timeSpentSeconds: 0 })
    );
    taskRepository.update.mockResolvedValue(buildTask());

    await useCase.execute({ taskId: "task-1", userId: "user-1" });

    const call = taskRepository.update.mock.calls[0][1];
    expect(call.timerStartedAt).toBeNull();
    expect(call.timeSpentSeconds).toBeGreaterThanOrEqual(60);
    expect(call.timeSpentSeconds).toBeLessThanOrEqual(62);
  });

  it("is idempotent when timer is not running (no repository write)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StopTaskTimerUseCase(taskRepository);
    const task = buildTask({ timerStartedAt: null, timeSpentSeconds: 99 });
    taskRepository.findById.mockResolvedValue(task);

    const result = await useCase.execute({ taskId: "task-1", userId: "user-1" });

    expect(result).toBe(task);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("clamps negative elapsed to zero (clock skew safety)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StopTaskTimerUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(
      buildTask({
        timerStartedAt: new Date("2026-05-11T10:00:00Z"),
        timeSpentSeconds: 10,
      })
    );
    taskRepository.update.mockResolvedValue(buildTask());

    await useCase.execute({
      taskId: "task-1",
      userId: "user-1",
      now: new Date("2026-05-11T09:59:00Z"),
    });

    expect(taskRepository.update).toHaveBeenCalledWith("task-1", {
      timerStartedAt: null,
      timeSpentSeconds: 10,
    });
  });

  it("throws TaskNotFoundException when missing", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StopTaskTimerUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ taskId: "x", userId: "user-1" })
    ).rejects.toBeInstanceOf(TaskNotFoundException);
  });

  it("throws UnauthorizedTaskAccessException for non-owner (never stops foreign timers)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new StopTaskTimerUseCase(taskRepository);
    taskRepository.findById.mockResolvedValue(buildTask({ userId: "user-1" }));
    await expect(
      useCase.execute({ taskId: "task-1", userId: "user-2" })
    ).rejects.toBeInstanceOf(UnauthorizedTaskAccessException);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });
});
