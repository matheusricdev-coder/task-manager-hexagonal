import { ListTasksUseCase } from "../../../../src/application/useCases/tasks/ListTasksUseCase";
import { buildTask, makeTaskRepositoryMock } from "../../../helpers/mocks";

describe("ListTasksUseCase", () => {
  it("forwards filters and pagination defaults to repository", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new ListTasksUseCase(taskRepository);
    const tasks = [buildTask(), buildTask({ id: "task-2" })];
    taskRepository.findManyByUser.mockResolvedValue({ items: tasks, total: 2 });

    const result = await useCase.execute({
      userId: "user-1",
      status: "DONE",
      search: "report",
    });

    expect(taskRepository.findManyByUser).toHaveBeenCalledWith(
      "user-1",
      { status: "DONE", priority: undefined, search: "report" },
      { page: 1, pageSize: 10 }
    );
    expect(result.data).toBe(tasks);
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
    });
  });

  it("computes totalPages from total and page size", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new ListTasksUseCase(taskRepository);
    taskRepository.findManyByUser.mockResolvedValue({ items: [], total: 47 });

    const result = await useCase.execute({
      userId: "user-1",
      page: 3,
      pageSize: 10,
    });

    expect(result.pagination).toEqual({
      page: 3,
      pageSize: 10,
      total: 47,
      totalPages: 5,
    });
  });

  it("clamps invalid page/pageSize to safe defaults", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new ListTasksUseCase(taskRepository);
    taskRepository.findManyByUser.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({
      userId: "user-1",
      page: 0,
      pageSize: 1000,
    });

    expect(taskRepository.findManyByUser).toHaveBeenCalledWith(
      "user-1",
      expect.anything(),
      { page: 1, pageSize: 100 }
    );
  });

  it("returns totalPages >= 1 when there are no tasks", async () => {
    const taskRepository = makeTaskRepositoryMock();
    const useCase = new ListTasksUseCase(taskRepository);
    taskRepository.findManyByUser.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.pagination.totalPages).toBe(1);
  });
});
