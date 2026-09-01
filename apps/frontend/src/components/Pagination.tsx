import { Select } from "./Select";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  compact?: boolean;
};

const PAGE_SIZES = [10, 20, 50];

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, compact }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={compact ? "alert-pagination is-compact" : "alert-pagination"}>
      <div className="alert-page-info text-muted">
        共 <strong style={{ color: "var(--text-1)" }}>{total}</strong> 条
        {compact ? null : (
          <>
            {" "}
            · 显示 {from}–{to} · 每页
            <Select
              variant="compact"
              aria-label="每页条数"
              value={String(pageSize)}
              options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
              onChange={(next) => onPageSizeChange?.(Number(next) || 10)}
            />
            条
          </>
        )}
      </div>
      <div className="alert-page-btns">
        <button type="button" className="alert-page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          上一页
        </button>
        <button type="button" className="alert-page-btn active">
          {page}
        </button>
        <button type="button" className="alert-page-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          下一页
        </button>
      </div>
    </div>
  );
}
