import {
  BULK_TASKS_LIMIT,
  CreateTasksBulkUseCase,
} from "../../../../src/application/useCases/tasks/CreateTasksBulkUseCase";
import { ValidationException } from "../../../../src/domain/errors/ValidationException";
import { makeTaskRepositoryMock } from "../../../helpers/mocks";

describe("CreateTasksBulkUseCase", () => {
  it("creates many tasks scoped to userId with defaults", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new CreateTasksBulkUseCase(taskRepository);
    taskRepository.createMany.mockResolvedValue(3);

    const result = await useCase.execute({
      userId: "user-1",
      tasks: [
        { title: "A" },
        { title: "B", description: "desc" },
        { title: "C", status: "DONE", priority: "HIGH" },
      ],
    });

    expect(taskRepository.createMany).toHaveBeenCalledWith([
      {
        title: "A",
        description: null,
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: null,
        userId: "user-1",
      },
      {
        title: "B",
        description: "desc",
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: null,
        userId: "user-1",
      },
      {
        title: "C",
        description: null,
        status: "DONE",
        priority: "HIGH",
        dueDate: null,
        userId: "user-1",
      },
    ]);
    expect(result).toEqual({ created: 3 });
  });

  it("accepts exactly 1 item (lower boundary)", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new CreateTasksBulkUseCase(taskRepository);
    taskRepository.createMany.mockResolvedValue(1);

    const result = await useCase.execute({
      userId: "user-1",
      tasks: [{ title: "single" }],
    });

    expect(result.created).toBe(1);
    expect(taskRepository.createMany).toHaveBeenCalledTimes(1);
  });

  it("rejects empty arrays with ValidationException", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new CreateTasksBulkUseCase(taskRepository);

    await expect(
      useCase.execute({ userId: "user-1", tasks: [] })
    ).rejects.toBeInstanceOf(ValidationException);
    expect(taskRepository.createMany).not.toHaveBeenCalled();
  });

  it(`rejects arrays larger than ${BULK_TASKS_LIMIT}`, async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new CreateTasksBulkUseCase(taskRepository);
    const tooMany = Array.from({ length: BULK_TASKS_LIMIT + 1 }, (_, i) => ({
      title: `t${i}`,
    }));

    await expect(
      useCase.execute({ userId: "user-1", tasks: tooMany })
    ).rejects.toBeInstanceOf(ValidationException);
    expect(taskRepository.createMany).not.toHaveBeenCalled();
  });

  it(`accepts exactly ${BULK_TASKS_LIMIT} items (upper boundary)`, async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new CreateTasksBulkUseCase(taskRepository);
    taskRepository.createMany.mockResolvedValue(BULK_TASKS_LIMIT);
    const tasks = Array.from({ length: BULK_TASKS_LIMIT }, (_, i) => ({
      title: `t${i}`,
    }));

    const result = await useCase.execute({ userId: "user-1", tasks });
    expect(result.created).toBe(BULK_TASKS_LIMIT);
  });

  it("forces all items to share the same userId regardless of input order", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new CreateTasksBulkUseCase(taskRepository);
    taskRepository.createMany.mockResolvedValue(2);

    await useCase.execute({
      userId: "owner-1",
      tasks: [{ title: "a" }, { title: "b" }],
    });

    const call = taskRepository.createMany.mock.calls[0][0];
    expect(call.every((t) => t.userId === "owner-1")).toBe(true);
  });

  it("forwards an explicit dueDate through to the repository", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new CreateTasksBulkUseCase(taskRepository);
    taskRepository.createMany.mockResolvedValue(1);
    const due = new Date("2026-08-01T00:00:00Z");

    await useCase.execute({
      userId: "u",
      tasks: [{ title: "deadline", dueDate: due }],
    });

    expect(taskRepository.createMany.mock.calls[0][0][0].dueDate).toBe(due);
  });
});
