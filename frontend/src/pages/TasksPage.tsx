import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ApiError,
  api,
  PaginationMeta,
  Task,
  TaskPriority,
  TaskStatus,
} from "../api/client";
import { Pagination } from "../components/Pagination";
import { useConfirm, useToast } from "../components/UIProvider";
import { useAuth } from "../context/AuthContext";

const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "PENDING",
};

const NEXT_PRIORITY: Record<TaskPriority, TaskPriority> = {
  LOW: "MEDIUM",
  MEDIUM: "HIGH",
  HIGH: "LOW",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: "Pendentes",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluídas",
};

const STATUS_LABEL_SINGULAR: Record<TaskStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

type SortKey = "created" | "due" | "priority";

const SORT_LABEL: Record<SortKey, string> = {
  created: "Mais recente",
  due: "Vencimento",
  priority: "Prioridade",
};

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

const formatRelative = (iso: string): string => {
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const formatDuration = (totalSeconds: number): string => {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

interface DueInfo {
  label: string;
  variant: "overdue" | "today" | "soon" | "future";
}

const dueInfo = (iso: string | null): DueInfo | null => {
  if (!iso) return null;
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) {
    return {
      label: `Atrasada ${Math.abs(diffDays)}d`,
      variant: "overdue",
    };
  }
  if (diffDays === 0) return { label: "Vence hoje", variant: "today" };
  if (diffDays <= 3) return { label: `Em ${diffDays}d`, variant: "soon" };
  return {
    label: due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    variant: "future",
  };
};

const initialsOf = (user: { name?: string; email: string } | null): string => {
  if (!user) return "?";
  const base = user.name || user.email;
  const parts = base.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
};

const greetingOf = (): string => {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const toIsoOrNull = (value: string): string | null =>
  value ? new Date(`${value}T12:00:00`).toISOString() : null;

const parseBulkLine = (
  line: string
): {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
} | null => {
  const parts = line.split("|").map((p) => p.trim());
  const title = parts[0];
  if (!title) return null;
  const out: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
  } = { title };
  if (parts[1]) out.description = parts[1];
  if (parts[2]) {
    const upper = parts[2].toUpperCase();
    if (PRIORITY_OPTIONS.includes(upper as TaskPriority)) {
      out.priority = upper as TaskPriority;
    }
  }
  if (parts[3]) {
    const iso = toIsoOrNull(parts[3]);
    if (iso) out.dueDate = iso;
  }
  return out;
};

const elapsedFor = (task: Task, now: number): number => {
  if (!task.timerStartedAt) return task.timeSpentSeconds;
  const started = new Date(task.timerStartedAt).getTime();
  return task.timeSpentSeconds + Math.max(0, Math.floor((now - started) / 1000));
};

// ───── Icons (inline SVGs) ─────
const I = {
  power: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  play: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  ),
  pause: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  flag: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 22V3h12l-2 4 2 4H6v11z" />
    </svg>
  ),
};

export const TasksPage = () => {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "">("");
  const [sortBy, setSortBy] = useState<SortKey>("created");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setError(null);
    try {
      const filters: {
        status?: string;
        priority?: string;
        page?: number;
        pageSize?: number;
      } = { page, pageSize };
      if (filterStatus) filters.status = filterStatus;
      if (filterPriority) filters.priority = filterPriority;
      const result = await api.listTasks(filters);
      setTasks(result.data);
      setPagination(result.pagination);
      if (result.pagination.totalPages < page && result.pagination.totalPages >= 1) {
        setPage(result.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao carregar tarefas");
    }
  }, [filterStatus, filterPriority, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const anyTimerRunning = useMemo(
    () => tasks.some((t) => !!t.timerStartedAt),
    [tasks]
  );

  useEffect(() => {
    if (!anyTimerRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [anyTimerRunning]);

  const counts = useMemo(() => {
    return tasks.reduce(
      (acc, t) => {
        acc[t.status] += 1;
        return acc;
      },
      { PENDING: 0, IN_PROGRESS: 0, DONE: 0 } as Record<TaskStatus, number>
    );
  }, [tasks]);

  const changeFilterStatus = useCallback((next: TaskStatus | "") => {
    setFilterStatus(next);
    setPage(1);
  }, []);

  const changeFilterPriority = useCallback((next: TaskPriority | "") => {
    setFilterPriority(next);
    setPage(1);
  }, []);

  const changePageSize = useCallback((next: number) => {
    setPageSize(next);
    setPage(1);
  }, []);

  const sortedTasks = useMemo(() => {
    const arr = [...tasks];
    if (sortBy === "created") return arr;
    if (sortBy === "priority") {
      return arr.sort(
        (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
      );
    }
    return arr.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, sortBy]);

  const createSingle = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.createTask({
        title,
        description: description.trim() ? description : null,
        priority,
        dueDate: toIsoOrNull(dueDate),
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("MEDIUM");
      setPage(1);
      toast.success("Tarefa adicionada.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha");
    } finally {
      setLoading(false);
    }
  };

  const createBulk = async () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const parsed = lines
      .map(parseBulkLine)
      .filter((p): p is NonNullable<ReturnType<typeof parseBulkLine>> => p !== null);
    if (parsed.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.createTasksBulk(parsed);
      toast.success(
        `${result.created} ${
          result.created === 1 ? "tarefa adicionada" : "tarefas adicionadas"
        }.`
      );
      setBulkText("");
      setPage(1);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Falha";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string, patch: Parameters<typeof api.updateTask>[1]) => {
    try {
      const updated = await api.updateTask(id, patch);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha");
    }
  };

  const remove = async (task: Task) => {
    const ok = await confirm({
      title: "Excluir tarefa?",
      message: (
        <>
          Esta ação remove permanentemente <b>“{task.title}”</b> do seu ledger.
          Não dá pra desfazer.
        </>
      ),
      confirmLabel: "Excluir",
      cancelLabel: "Manter",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast.success("Tarefa excluída.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Falha";
      setError(msg);
      toast.error(msg);
    }
  };

  const toggleTimer = async (task: Task) => {
    try {
      const updated = task.timerStartedAt
        ? await api.stopTimer(task.id)
        : await api.startTimer(task.id);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha");
    }
  };

  const startEditTitle = (task: Task) => {
    setEditingTitleId(task.id);
    setEditingTitleValue(task.title);
  };

  const commitEditTitle = async (task: Task) => {
    const next = editingTitleValue.trim();
    setEditingTitleId(null);
    if (!next || next === task.title) return;
    await update(task.id, { title: next });
  };

  const openDatePicker = (taskId: string) => {
    const el = document.getElementById(`due-${taskId}`) as HTMLInputElement | null;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  const firstName = user?.name?.split(" ")[0] ?? "por aí";
  const activeCount = counts.PENDING + counts.IN_PROGRESS;

  return (
    <div className="app">
      <header className="appbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          Pulse
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="user-pill">
            <span>{user?.name ?? user?.email}</span>
            <div className="avatar">{initialsOf(user)}</div>
          </div>
          <button
            className="icon-btn"
            onClick={logout}
            title="Sair"
            aria-label="Sair"
          >
            {I.power}
          </button>
        </div>
      </header>

      <section className="hero">
        <h1 className="h-1">
          {greetingOf()}, {firstName}.
        </h1>
        <p>
          Você tem <b>{activeCount}</b>{" "}
          {activeCount === 1 ? "tarefa ativa" : "tarefas ativas"} em andamento.
          {filterStatus || filterPriority ? " Filtros aplicados." : ""}
        </p>
      </section>

      <div className="stats stagger" role="group" aria-label="Filtrar por status">
        {(["PENDING", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((s) => {
          const isActive = filterStatus === s;
          return (
            <button
              key={s}
              type="button"
              className={`stat ${s === "IN_PROGRESS" ? "stat--accent" : ""} ${
                isActive ? "is-on" : ""
              }`}
              onClick={() => changeFilterStatus(filterStatus === s ? "" : s)}
              aria-pressed={isActive}
            >
              <div className="stat-num">
                {String(counts[s]).padStart(2, "0")}
              </div>
              <div className="stat-label">
                <span>{STATUS_LABEL[s]}</span>
                <span className="stat-chip">{isActive ? "Filtrando" : "Filtrar"}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid">
        <aside className="left">
          <section className="panel panel--lime">
            <div className="panel-head">
              <h2 className="panel-title">
                <span className="panel-title-dot" />
                Adicionar tarefa
              </h2>
            </div>
            <p className="panel-sub">O que está no seu radar?</p>
            <form onSubmit={createSingle} className="form">
              <div className="field">
                <label>Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auditar logs de produção"
                  required
                />
              </div>
              <div className="field">
                <label>Notas (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Contexto, links, prazos…"
                />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Prioridade</label>
                  <div className="seg" role="radiogroup" aria-label="Prioridade">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`seg-btn p-${p} ${priority === p ? "is-on" : ""}`}
                        onClick={() => setPriority(p)}
                        aria-checked={priority === p}
                        role="radio"
                      >
                        {PRIORITY_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Vencimento</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn" disabled={loading}>
                  Adicionar
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">
                <span className="panel-title-dot" />
                Importar em lote
              </h2>
            </div>
            <p className="panel-sub">
              Uma por linha · separadas por pipe:{" "}
              <code className="kbd">título | notas | prioridade | AAAA-MM-DD</code>
            </p>
            <div className="form">
              <div className="field">
                <textarea
                  rows={6}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={
                    "Auditar logs de produção | checar taxa de erro | HIGH | 2026-05-14\nBriefing do time sobre OKRs do Q3\nDeploy hotfix | rollback pronto | HIGH"
                  }
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={createBulk}
                  disabled={loading}
                  className="btn btn--ghost"
                >
                  Importar tudo
                </button>
              </div>
            </div>
          </section>
        </aside>

        <section>
          <div className="list-toolbar">
            <div className="list-count">
              {String(pagination.total).padStart(2, "0")}
              <small>{pagination.total === 1 ? "tarefa" : "tarefas"}</small>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                className="select"
                value={filterPriority}
                onChange={(e) => changeFilterPriority(e.target.value as TaskPriority | "")}
                aria-label="Filtrar por prioridade"
              >
                <option value="">Todas prioridades</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    Prioridade {PRIORITY_LABEL[p].toLowerCase()}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Ordenar tarefas"
              >
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    Ordenar: {SORT_LABEL[k]}
                  </option>
                ))}
              </select>
              <button
                className="icon-btn"
                onClick={() => void load()}
                title="Atualizar"
                aria-label="Atualizar"
              >
                {I.refresh}
              </button>
            </div>
          </div>

          {(filterStatus || filterPriority) && (
            <div className="filter-bar">
              <span>Filtros:</span>
              {filterStatus && (
                <button
                  className="filter-chip"
                  onClick={() => changeFilterStatus("")}
                >
                  {STATUS_LABEL[filterStatus]} {I.close}
                </button>
              )}
              {filterPriority && (
                <button
                  className="filter-chip"
                  onClick={() => changeFilterPriority("")}
                >
                  Prioridade {PRIORITY_LABEL[filterPriority].toLowerCase()} {I.close}
                </button>
              )}
            </div>
          )}

          {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}

          {sortedTasks.length === 0 ? (
            <div className="empty">
              <div className="empty-mark">✦</div>
              <h3>
                {pagination.total === 0
                  ? "Nada por aqui ainda."
                  : "Nenhuma tarefa nesta página."}
              </h3>
              <p>
                {pagination.total === 0
                  ? "Adicione sua primeira tarefa à esquerda para começar."
                  : "Tente outra página ou limpe os filtros."}
              </p>
            </div>
          ) : (
            <div className="tasks-list stagger">
              {sortedTasks.map((task) => {
                const elapsed = elapsedFor(task, now);
                const due = dueInfo(task.dueDate);
                const isEditing = editingTitleId === task.id;
                return (
                  <article
                    key={task.id}
                    className={`task ${task.status}`}
                    data-priority={task.priority}
                  >
                    <div className="task-rail" aria-hidden />

                    <div className="task-main">
                      <div className="task-head">
                        <button
                          type="button"
                          className={`status-pill ${task.status}`}
                          onClick={() =>
                            update(task.id, { status: NEXT_STATUS[task.status] })
                          }
                          title="Clique para avançar o status"
                        >
                          {STATUS_LABEL_SINGULAR[task.status]}
                        </button>

                        <button
                          type="button"
                          className={`prio-pill p-${task.priority}`}
                          onClick={() =>
                            update(task.id, {
                              priority: NEXT_PRIORITY[task.priority],
                            })
                          }
                          title="Clique para mudar a prioridade"
                        >
                          <span className="prio-icon">{I.flag}</span>
                          {PRIORITY_LABEL[task.priority]}
                        </button>

                        {due ? (
                          <button
                            type="button"
                            className={`due-pill due-${due.variant}`}
                            onClick={() => openDatePicker(task.id)}
                            title="Clique para mudar o vencimento"
                          >
                            {I.calendar}
                            {due.label}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="due-pill due-empty"
                            onClick={() => openDatePicker(task.id)}
                            title="Definir vencimento"
                          >
                            {I.calendar} Definir data
                          </button>
                        )}

                        <input
                          id={`due-${task.id}`}
                          type="date"
                          className="sr-date"
                          value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                          onChange={(e) =>
                            update(task.id, { dueDate: toIsoOrNull(e.target.value) })
                          }
                        />
                      </div>

                      {isEditing ? (
                        <input
                          autoFocus
                          className="title-edit"
                          value={editingTitleValue}
                          onChange={(e) => setEditingTitleValue(e.target.value)}
                          onBlur={() => commitEditTitle(task)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEditTitle(task);
                            if (e.key === "Escape") setEditingTitleId(null);
                          }}
                        />
                      ) : (
                        <h3
                          className="task-title"
                          onClick={() => startEditTitle(task)}
                          title="Clique para editar"
                        >
                          {task.title}
                        </h3>
                      )}

                      {task.description && (
                        <div className="task-desc">{task.description}</div>
                      )}

                      <div className="task-meta">
                        <span className="meta-item">
                          criada {formatRelative(task.createdAt)}
                        </span>
                        <span className="meta-dot" />
                        <span
                          className={`meta-item meta-time ${
                            task.timerStartedAt ? "is-running" : ""
                          }`}
                        >
                          {task.timerStartedAt && (
                            <span className="live-dot" />
                          )}
                          {formatDuration(elapsed)} registrados
                        </span>
                      </div>
                    </div>

                    <div className="task-actions">
                      <button
                        type="button"
                        className={`timer-btn ${task.timerStartedAt ? "is-running" : ""}`}
                        onClick={() => toggleTimer(task)}
                        aria-label={
                          task.timerStartedAt ? "Pausar cronômetro" : "Iniciar cronômetro"
                        }
                        title={
                          task.timerStartedAt
                            ? `Pausar · ${formatDuration(elapsed)}`
                            : `Iniciar · ${formatDuration(elapsed)}`
                        }
                      >
                        {task.timerStartedAt ? I.pause : I.play}
                      </button>
                      <button
                        type="button"
                        className="task-del"
                        onClick={() => remove(task)}
                        aria-label="Excluir tarefa"
                        title="Excluir"
                      >
                        {I.close}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={setPage}
            onPageSizeChange={changePageSize}
          />
        </section>
      </div>
    </div>
  );
};
