import { ZodError } from "zod";
import { CreateTaskUseCase } from "../../../src/application/useCases/tasks/CreateTaskUseCase";
import { CreateTasksBulkUseCase } from "../../../src/application/useCases/tasks/CreateTasksBulkUseCase";
import { DeleteTaskUseCase } from "../../../src/application/useCases/tasks/DeleteTaskUseCase";
import { GetTaskByIdUseCase } from "../../../src/application/useCases/tasks/GetTaskByIdUseCase";
import { ListTasksUseCase } from "../../../src/application/useCases/tasks/ListTasksUseCase";
import { StartTaskTimerUseCase } from "../../../src/application/useCases/tasks/StartTaskTimerUseCase";
import { StopTaskTimerUseCase } from "../../../src/application/useCases/tasks/StopTaskTimerUseCase";
import { UpdateTaskUseCase } from "../../../src/application/useCases/tasks/UpdateTaskUseCase";
import { TaskNotFoundException } from "../../../src/domain/errors/TaskNotFoundException";
import { UnauthenticatedException } from "../../../src/domain/errors/UnauthenticatedException";
import { UnauthorizedTaskAccessException } from "../../../src/domain/errors/UnauthorizedTaskAccessException";
import { TaskController } from "../../../src/infrastructure/http/controllers/TaskController";
import { buildTask } from "../../helpers/mocks";
import { mockAuthRequest, mockResponse } from "../../helpers/http";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("TaskController", () => {
  const setup = () => {
    const createTaskUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateTaskUseCase>;
    const createTasksBulkUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateTasksBulkUseCase>;
    const listTasksUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListTasksUseCase>;
    const getTaskByIdUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetTaskByIdUseCase>;
    const updateTaskUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateTaskUseCase>;
    const deleteTaskUseCase = { execute: jest.fn() } as unknown as jest.Mocked<DeleteTaskUseCase>;
    const startTaskTimerUseCase = { execute: jest.fn() } as unknown as jest.Mocked<StartTaskTimerUseCase>;
    const stopTaskTimerUseCase = { execute: jest.fn() } as unknown as jest.Mocked<StopTaskTimerUseCase>;

    const controller = new TaskController(
      createTaskUseCase,
      createTasksBulkUseCase,
      listTasksUseCase,
      getTaskByIdUseCase,
      updateTaskUseCase,
      deleteTaskUseCase,
      startTaskTimerUseCase,
      stopTaskTimerUseCase
    );

    return {
      controller,
      createTaskUseCase,
      createTasksBulkUseCase,
      listTasksUseCase,
      getTaskByIdUseCase,
      updateTaskUseCase,
      deleteTaskUseCase,
      startTaskTimerUseCase,
      stopTaskTimerUseCase,
    };
  };

  describe("authentication guard", () => {
    it("throws UnauthenticatedException when middleware did not attach currentUser", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ currentUser: undefined, body: { title: "x" } });
      const res = mockResponse();
      await expect(controller.create(req, res)).rejects.toBeInstanceOf(UnauthenticatedException);
    });
  });

  describe("create (single) — happy path", () => {
    it("creates a single task and returns 201", async () => {
      const { controller, createTaskUseCase } = setup();
      const task = buildTask();
      createTaskUseCase.execute.mockResolvedValue(task);

      const req = mockAuthRequest({ body: { title: "Buy milk" } });
      const res = mockResponse();
      await controller.create(req, res);

      expect(createTaskUseCase.execute).toHaveBeenCalledWith({
        title: "Buy milk",
        description: null,
        status: undefined,
        priority: undefined,
        dueDate: null,
        userId: "user-1",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(task);
    });

    it("forwards priority and parses dueDate string into Date", async () => {
      const { controller, createTaskUseCase } = setup();
      createTaskUseCase.execute.mockResolvedValue(buildTask());

      const req = mockAuthRequest({
        body: { title: "T", priority: "HIGH", dueDate: "2026-06-01" },
      });
      const res = mockResponse();
      await controller.create(req, res);

      const call = createTaskUseCase.execute.mock.calls[0][0];
      expect(call.priority).toBe("HIGH");
      expect(call.dueDate).toBeInstanceOf(Date);
    });
  });

  describe("create (single) — invalid input → ZodError", () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["missing title", { description: "no title" }],
      ["empty body", {}],
      ["empty title string", { title: "" }],
      ["title over 255 chars", { title: "x".repeat(256) }],
      ["invalid status value", { title: "ok", status: "MAYBE" }],
      ["invalid priority value", { title: "ok", priority: "URGENT" }],
      ["malformed dueDate string", { title: "ok", dueDate: "yesterday" }],
      ["description over 10k chars", { title: "ok", description: "x".repeat(10_001) }],
    ];

    test.each(cases)("rejects %s", async (_label, body) => {
      const { controller } = setup();
      const req = mockAuthRequest({ body });
      const res = mockResponse();
      await expect(controller.create(req, res)).rejects.toBeInstanceOf(ZodError);
    });
  });

  describe("create (bulk) — happy path", () => {
    it("creates many tasks via bulk use case", async () => {
      const { controller, createTasksBulkUseCase, createTaskUseCase } = setup();
      createTasksBulkUseCase.execute.mockResolvedValue({ created: 2 });

      const req = mockAuthRequest({
        body: { tasks: [{ title: "A" }, { title: "B", priority: "LOW" }] },
      });
      const res = mockResponse();
      await controller.create(req, res);

      const call = createTasksBulkUseCase.execute.mock.calls[0][0];
      expect(call.userId).toBe("user-1");
      expect(call.tasks).toHaveLength(2);
      expect(call.tasks[1].priority).toBe("LOW");
      expect(createTaskUseCase.execute).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("create (bulk) — invalid input → ZodError", () => {
    it("rejects empty bulk array", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ body: { tasks: [] } });
      const res = mockResponse();
      await expect(controller.create(req, res)).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects bulk array exceeding 1000 items", async () => {
      const { controller } = setup();
      const tasks = Array.from({ length: 1001 }, (_, i) => ({ title: `t${i}` }));
      const req = mockAuthRequest({ body: { tasks } });
      const res = mockResponse();
      await expect(controller.create(req, res)).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects bulk item missing title", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ body: { tasks: [{ description: "no title" }] } });
      const res = mockResponse();
      await expect(controller.create(req, res)).rejects.toBeInstanceOf(ZodError);
    });
  });

  describe("list — happy path", () => {
    it("returns paginated tasks with filters", async () => {
      const { controller, listTasksUseCase } = setup();
      const paginated = {
        data: [buildTask()],
        pagination: { page: 2, pageSize: 10, total: 12, totalPages: 2 },
      };
      listTasksUseCase.execute.mockResolvedValue(paginated);

      const req = mockAuthRequest({
        query: { status: "PENDING", priority: "HIGH", page: "2", pageSize: "10" },
      });
      const res = mockResponse();
      await controller.list(req, res);

      expect(listTasksUseCase.execute).toHaveBeenCalledWith({
        userId: "user-1",
        status: "PENDING",
        priority: "HIGH",
        page: 2,
        pageSize: 10,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(paginated);
    });
  });

  describe("list — invalid input → ZodError", () => {
    const cases: Array<[string, Record<string, string>]> = [
      ["invalid status", { status: "WAT" }],
      ["invalid priority", { priority: "URGENT" }],
      ["page=0", { page: "0" }],
      ["page negative", { page: "-1" }],
      ["pageSize > 100", { pageSize: "500" }],
      ["pageSize=0", { pageSize: "0" }],
      ["page non-numeric", { page: "abc" }],
      ["search too long", { search: "x".repeat(256) }],
    ];

    test.each(cases)("rejects %s", async (_label, query) => {
      const { controller } = setup();
      const req = mockAuthRequest({ query } as Parameters<typeof mockAuthRequest>[0]);
      const res = mockResponse();
      await expect(controller.list(req, res)).rejects.toBeInstanceOf(ZodError);
    });
  });

  describe("getById", () => {
    it("returns the task", async () => {
      const { controller, getTaskByIdUseCase } = setup();
      const task = buildTask({ id: VALID_UUID });
      getTaskByIdUseCase.execute.mockResolvedValue(task);

      const req = mockAuthRequest({ params: { id: VALID_UUID } });
      const res = mockResponse();
      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("rejects non-uuid id", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ params: { id: "not-uuid" } });
      const res = mockResponse();
      await expect(controller.getById(req, res)).rejects.toBeInstanceOf(ZodError);
    });

    it("propagates TaskNotFoundException from use case", async () => {
      const { controller, getTaskByIdUseCase } = setup();
      getTaskByIdUseCase.execute.mockRejectedValue(new TaskNotFoundException(VALID_UUID));
      const req = mockAuthRequest({ params: { id: VALID_UUID } });
      const res = mockResponse();
      await expect(controller.getById(req, res)).rejects.toBeInstanceOf(TaskNotFoundException);
    });

    it("propagates UnauthorizedTaskAccessException", async () => {
      const { controller, getTaskByIdUseCase } = setup();
      getTaskByIdUseCase.execute.mockRejectedValue(new UnauthorizedTaskAccessException());
      const req = mockAuthRequest({ params: { id: VALID_UUID } });
      const res = mockResponse();
      await expect(controller.getById(req, res)).rejects.toBeInstanceOf(UnauthorizedTaskAccessException);
    });
  });

  describe("update", () => {
    it("updates the task with priority and dueDate", async () => {
      const { controller, updateTaskUseCase } = setup();
      const task = buildTask({ id: VALID_UUID, title: "Updated", priority: "HIGH" });
      updateTaskUseCase.execute.mockResolvedValue(task);

      const req = mockAuthRequest({
        params: { id: VALID_UUID },
        body: { title: "Updated", priority: "HIGH", dueDate: "2026-06-15" },
      });
      const res = mockResponse();
      await controller.update(req, res);

      const call = updateTaskUseCase.execute.mock.calls[0][0];
      expect(call.title).toBe("Updated");
      expect(call.priority).toBe("HIGH");
      expect(call.dueDate).toBeInstanceOf(Date);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("rejects empty update body (no fields → no-op disallowed)", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ params: { id: VALID_UUID }, body: {} });
      const res = mockResponse();
      await expect(controller.update(req, res)).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects invalid uuid param", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ params: { id: "bad" }, body: { title: "x" } });
      const res = mockResponse();
      await expect(controller.update(req, res)).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects invalid status in update body", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ params: { id: VALID_UUID }, body: { status: "MAYBE" } });
      const res = mockResponse();
      await expect(controller.update(req, res)).rejects.toBeInstanceOf(ZodError);
    });

    it("propagates domain errors from update use case", async () => {
      const { controller, updateTaskUseCase } = setup();
      updateTaskUseCase.execute.mockRejectedValue(new UnauthorizedTaskAccessException());
      const req = mockAuthRequest({ params: { id: VALID_UUID }, body: { title: "x" } });
      const res = mockResponse();
      await expect(controller.update(req, res)).rejects.toBeInstanceOf(UnauthorizedTaskAccessException);
    });
  });

  describe("remove", () => {
    it("deletes the task and returns 204", async () => {
      const { controller, deleteTaskUseCase } = setup();
      deleteTaskUseCase.execute.mockResolvedValue();

      const req = mockAuthRequest({ params: { id: VALID_UUID } });
      const res = mockResponse();
      await controller.remove(req, res);

      expect(deleteTaskUseCase.execute).toHaveBeenCalledWith({
        taskId: VALID_UUID,
        userId: "user-1",
      });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("rejects invalid uuid", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ params: { id: "bad" } });
      const res = mockResponse();
      await expect(controller.remove(req, res)).rejects.toBeInstanceOf(ZodError);
    });

    it("propagates TaskNotFoundException", async () => {
      const { controller, deleteTaskUseCase } = setup();
      deleteTaskUseCase.execute.mockRejectedValue(new TaskNotFoundException(VALID_UUID));
      const req = mockAuthRequest({ params: { id: VALID_UUID } });
      const res = mockResponse();
      await expect(controller.remove(req, res)).rejects.toBeInstanceOf(TaskNotFoundException);
    });
  });

  describe("timer", () => {
    it("starts the timer and returns 200", async () => {
      const { controller, startTaskTimerUseCase } = setup();
      const task = buildTask({ id: VALID_UUID });
      startTaskTimerUseCase.execute.mockResolvedValue(task);

      const req = mockAuthRequest({ params: { id: VALID_UUID } });
      const res = mockResponse();
      await controller.startTimer(req, res);

      expect(startTaskTimerUseCase.execute).toHaveBeenCalledWith({
        taskId: VALID_UUID,
        userId: "user-1",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(task);
    });

    it("stops the timer and returns 200", async () => {
      const { controller, stopTaskTimerUseCase } = setup();
      const task = buildTask({ id: VALID_UUID });
      stopTaskTimerUseCase.execute.mockResolvedValue(task);

      const req = mockAuthRequest({ params: { id: VALID_UUID } });
      const res = mockResponse();
      await controller.stopTimer(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("rejects invalid task id when starting", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ params: { id: "bad" } });
      const res = mockResponse();
      await expect(controller.startTimer(req, res)).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects invalid task id when stopping", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ params: { id: "bad" } });
      const res = mockResponse();
      await expect(controller.stopTimer(req, res)).rejects.toBeInstanceOf(ZodError);
    });

    it("propagates TaskNotFoundException when starting a non-existent timer", async () => {
      const { controller, startTaskTimerUseCase } = setup();
      startTaskTimerUseCase.execute.mockRejectedValue(new TaskNotFoundException(VALID_UUID));
      const req = mockAuthRequest({ params: { id: VALID_UUID } });
      const res = mockResponse();
      await expect(controller.startTimer(req, res)).rejects.toBeInstanceOf(TaskNotFoundException);
    });

    it("propagates UnauthorizedTaskAccessException when stopping foreign timer", async () => {
      const { controller, stopTaskTimerUseCase } = setup();
      stopTaskTimerUseCase.execute.mockRejectedValue(new UnauthorizedTaskAccessException());
      const req = mockAuthRequest({ params: { id: VALID_UUID } });
      const res = mockResponse();
      await expect(controller.stopTimer(req, res)).rejects.toBeInstanceOf(UnauthorizedTaskAccessException);
    });
  });
});
