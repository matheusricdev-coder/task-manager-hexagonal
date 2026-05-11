interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const PAGE_SIZES = [5, 10, 25, 50];

const buildPageRange = (
  current: number,
  total: number,
  siblings = 1
): (number | "…")[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const showLeft = current - siblings > 2;
  const showRight = current + siblings < total - 1;

  if (!showLeft && showRight) return [1, 2, 3, 4, 5, "…", total];
  if (showLeft && !showRight)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
};

export const Pagination = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) => {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = buildPageRange(page, totalPages);

  return (
    <nav className="pagination" aria-label="Paginação">
      <span className="pagination-info">
        <b>{start}–{end}</b> de <b>{total}</b>
        {total === 1 ? " tarefa" : " tarefas"}
      </span>

      <div className="pagination-controls">
        {onPageSizeChange && (
          <select
            className="select pagination-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Itens por página"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} por página
              </option>
            ))}
          </select>
        )}

        <div className="pagination-pages">
          <button
            type="button"
            className="page-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            ←
          </button>

          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="page-gap" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`page-btn ${p === page ? "is-active" : ""}`}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Ir para página ${p}`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            className="page-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Próxima página"
          >
            →
          </button>
        </div>
      </div>
    </nav>
  );
};
