'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useMemo, useTransition } from 'react';

type QueryValue = string | number | boolean | null | undefined;

export type PageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export type MetricGridProps = {
  items: { label: string; value: string; hint: string }[];
};

export type FilterFieldOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type FilterField = {
  name?: string;
  label: string;
  kind?: 'input' | 'select';
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  options?: FilterFieldOption[];
  disabled?: boolean;
  inputType?: string;
};

export type FilterBarProps = {
  fields: FilterField[];
  actions?: ReactNode;
  baseUrl?: string;
  pageParam?: string;
  resetPreserveParams?: string[];
  submitLabel?: string;
  resetLabel?: string;
};

export type TableColumn =
  | string
  | {
      label: string;
      key?: string;
      sortKey?: string;
      defaultSortOrder?: 'asc' | 'desc';
      align?: 'left' | 'center' | 'right';
      className?: string;
    };

export type DataTableProps = {
  title: string;
  columns: TableColumn[];
  rows: ReactNode[][];
  description?: string;
  actions?: ReactNode;
  baseUrl?: string;
  sortKeyParam?: string;
  sortOrderParam?: string;
  emptyLabel?: string;
};

export type TabItem =
  | string
  | {
      label: string;
      value?: string;
      href?: string;
      disabled?: boolean;
    };

export type TabStripProps = {
  tabs: TabItem[];
  active?: string;
  baseUrl?: string;
  tabParam?: string;
};

export type PaginationBarProps = {
  pageNo: number;
  pageSize: number;
  total: number;
  baseUrl?: string;
  pageParam?: string;
  pageSizeParam?: string;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  label?: string;
};

function slugify(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[\s_/]+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'field'
  );
}

function toSearchParams(source?: URLSearchParams | string | null) {
  return new URLSearchParams(source ? source.toString() : '');
}

function applyQueryValue(target: URLSearchParams, key: string, value: QueryValue) {
  if (value === undefined || value === null || value === '') {
    target.delete(key);
    return;
  }

  target.set(key, String(value));
}

function buildHref(
  baseUrl: string,
  current: URLSearchParams,
  updates: Record<string, QueryValue>,
  options?: { preserveKeys?: string[] },
) {
  const next = new URLSearchParams(current.toString());

  if (options?.preserveKeys?.length) {
    const preserved = new URLSearchParams();

    options.preserveKeys.forEach((key) => {
      current.getAll(key).forEach((value) => {
        preserved.append(key, value);
      });
    });

    next.forEach((_value, key) => {
      if (!options.preserveKeys?.includes(key)) {
        next.delete(key);
      }
    });

    preserved.forEach((value, key) => {
      next.append(key, value);
    });
  }

  Object.entries(updates).forEach(([key, value]) => {
    applyQueryValue(next, key, value);
  });

  const query = next.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

function normalizeTab(tab: TabItem) {
  if (typeof tab === 'string') {
    return { label: tab, value: tab, disabled: false };
  }

  return {
    label: tab.label,
    value: tab.value ?? tab.label,
    href: tab.href,
    disabled: Boolean(tab.disabled),
  };
}

function normalizeColumn(column: TableColumn) {
  if (typeof column === 'string') {
    return { label: column };
  }

  return column;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <section className="page-header hero-card">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="button-row">{actions}</div> : null}
    </section>
  );
}

export function MetricGrid({ items }: MetricGridProps) {
  return (
    <section className="grid-4">
      {items.map((item) => (
        <article key={item.label} className="metric-card">
          <div className="label">{item.label}</div>
          <div className="value">{item.value}</div>
          <div className="hint">{item.hint}</div>
        </article>
      ))}
    </section>
  );
}

export function FilterBar({
  fields,
  actions,
  baseUrl,
  pageParam = 'pageNo',
  resetPreserveParams = ['pageSize'],
  submitLabel = '查询',
  resetLabel = '重置',
}: FilterBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParams = useMemo(() => toSearchParams(searchParams), [searchParams]);
  const [isPending, startTransition] = useTransition();

  const normalizedFields = useMemo(
    () =>
      fields.map((field) => {
        const name = field.name ?? slugify(field.label);
        const defaultValue = field.defaultValue ?? field.value ?? '';
        const currentValue = currentParams.get(name) ?? defaultValue;
        const options = field.options?.length
          ? field.options
          : field.kind === 'select'
            ? [{ label: field.value ?? field.label, value: currentValue || field.value || '' }]
            : undefined;

        return {
          ...field,
          name,
          defaultValue,
          currentValue,
          options,
        };
      }),
    [currentParams, fields],
  );

  function navigate(nextParams: URLSearchParams) {
    const target = buildHref(baseUrl ?? pathname ?? '/', nextParams, {});
    startTransition(() => {
      router.push(target);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextParams = toSearchParams(currentParams);

    normalizedFields.forEach((field) => {
      const rawValue = formData.get(field.name);
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';
      applyQueryValue(nextParams, field.name, value);
    });

    nextParams.set(pageParam, '1');
    navigate(nextParams);
  }

  function handleReset() {
    const nextParams = new URLSearchParams();
    resetPreserveParams.forEach((key) => {
      const value = currentParams.get(key);
      if (value) {
        nextParams.set(key, value);
      }
    });
    nextParams.set(pageParam, '1');
    navigate(nextParams);
  }

  return (
    <form className="filter-bar filter-form" onSubmit={handleSubmit}>
      <div className="filter-fields">
        {normalizedFields.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            {field.kind === 'select' ? (
              <select
                id={field.name}
                className="select"
                name={field.name}
                defaultValue={field.currentValue}
                disabled={field.disabled}
              >
                {field.options?.map((option) => (
                  <option key={`${field.name}-${option.value}`} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={field.name}
                className="input"
                name={field.name}
                defaultValue={field.currentValue}
                placeholder={field.placeholder}
                type={field.inputType ?? 'text'}
                disabled={field.disabled}
              />
            )}
          </div>
        ))}
      </div>
      <div className="filter-actions">
        {actions ?? (
          <>
            <button className="btn primary" type="submit" disabled={isPending}>
              {submitLabel}
            </button>
            <button className="btn" type="button" onClick={handleReset} disabled={isPending}>
              {resetLabel}
            </button>
          </>
        )}
      </div>
    </form>
  );
}

export function DataTable({
  title,
  columns,
  rows,
  description,
  actions,
  baseUrl,
  sortKeyParam = 'sortBy',
  sortOrderParam = 'sortOrder',
  emptyLabel = '当前筛选条件下暂无数据。',
}: DataTableProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParams = useMemo(() => toSearchParams(searchParams), [searchParams]);
  const [isPending, startTransition] = useTransition();
  const normalizedColumns = useMemo(() => columns.map(normalizeColumn), [columns]);
  const activeSortKey = currentParams.get(sortKeyParam) ?? '';
  const activeSortOrder = currentParams.get(sortOrderParam) === 'asc' ? 'asc' : 'desc';

  function navigateSort(nextKey: string, defaultOrder: 'asc' | 'desc' = 'asc') {
    const nextParams = toSearchParams(currentParams);
    const nextOrder = activeSortKey === nextKey ? (activeSortOrder === 'asc' ? 'desc' : 'asc') : defaultOrder;
    nextParams.set(sortKeyParam, nextKey);
    nextParams.set(sortOrderParam, nextOrder);
    nextParams.set('pageNo', '1');

    const target = buildHref(baseUrl ?? pathname ?? '/', nextParams, {});
    startTransition(() => {
      router.push(target);
    });
  }

  return (
    <section className="table-card">
      <div className="page-header table-header">
        <div>
          <h3>{title}</h3>
          <p>{description ?? '当前展示真实数据列表。'}</p>
        </div>
        {actions ? <div className="button-row">{actions}</div> : null}
      </div>
      <table className={`data-table${isPending ? ' pending' : ''}`}>
        <thead>
          <tr>
            {normalizedColumns.map((column) => {
              const label = typeof column === 'string' ? column : column.label;
              const sortKey = typeof column === 'string' ? undefined : column.sortKey ?? column.key;
              const isActive = Boolean(sortKey && activeSortKey === sortKey);
              const ariaSort = isActive ? (activeSortOrder === 'asc' ? 'ascending' : 'descending') : undefined;

              return (
                <th key={label} scope="col" aria-sort={ariaSort}>
                  {sortKey ? (
                    <button
                      type="button"
                      className={`sortable-th${isActive ? ' active' : ''}`}
                      onClick={() =>
                        navigateSort(sortKey, typeof column === 'string' ? 'asc' : column.defaultSortOrder ?? 'asc')
                      }
                    >
                      <span>{label}</span>
                      <span className="sortable-indicator" aria-hidden="true">
                        {isActive ? (activeSortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="table-empty-row" colSpan={Math.max(normalizedColumns.length, 1)}>
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export function TabStrip({ tabs, active, baseUrl, tabParam = 'tab' }: TabStripProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentParams = useMemo(() => toSearchParams(searchParams), [searchParams]);
  const normalizedTabs = useMemo(() => tabs.map(normalizeTab), [tabs]);
  const fallbackActive = active ?? currentParams.get(tabParam) ?? normalizedTabs[0]?.value ?? '';
  const targetBase = baseUrl ?? pathname ?? '/';

  return (
    <nav className="tabs" aria-label="页面标签">
      {normalizedTabs.map((tab) => {
        const isActive = fallbackActive === tab.value;
        const href = tab.href ?? buildHref(targetBase, currentParams, { [tabParam]: tab.value, pageNo: '1' });

        if (tab.disabled) {
          return (
            <span key={tab.value} className="tab disabled" aria-disabled="true">
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.value}
            href={href}
            className={`tab${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PaginationBar({
  pageNo,
  pageSize,
  total,
  baseUrl,
  pageParam = 'pageNo',
  pageSizeParam = 'pageSize',
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  label = '分页',
}: PaginationBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParams = useMemo(() => toSearchParams(searchParams), [searchParams]);
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, pageNo), totalPages);
  const targetBase = baseUrl ?? pathname ?? '/';

  function buildPageHref(nextPage: number) {
    const nextParams = toSearchParams(currentParams);
    nextParams.set(pageParam, String(nextPage));
    nextParams.set(pageSizeParam, String(pageSize));
    return buildHref(targetBase, nextParams, {});
  }

  function handlePageSizeChange(value: string) {
    const nextParams = toSearchParams(currentParams);
    nextParams.set(pageSizeParam, value);
    nextParams.set(pageParam, '1');
    const target = buildHref(targetBase, nextParams, {});
    startTransition(() => {
      router.push(target);
    });
  }

  const prevHref = buildPageHref(Math.max(1, currentPage - 1));
  const nextHref = buildPageHref(Math.min(totalPages, currentPage + 1));

  return (
    <section className={`pagination-bar${isPending ? ' pending' : ''}`} aria-label={label}>
      <div className="pagination-summary">
        <span className="badge">{label}</span>
        <span className="subtle">
          第 {currentPage} / {totalPages} 页，共 {total} 条
        </span>
      </div>
      <div className="pagination-controls">
        {currentPage > 1 ? (
          <Link className="btn" href={prevHref} aria-label="上一页">
            上一页
          </Link>
        ) : (
          <span className="btn disabled" aria-disabled="true">
            上一页
          </span>
        )}
        {currentPage < totalPages ? (
          <Link className="btn" href={nextHref} aria-label="下一页">
            下一页
          </Link>
        ) : (
          <span className="btn disabled" aria-disabled="true">
            下一页
          </span>
        )}
        {showPageSize ? (
          <div className="field pagination-size">
            <label htmlFor={`${pageSizeParam}-select`}>每页条数</label>
            <select
              id={`${pageSizeParam}-select`}
              className="select"
              value={String(pageSize)}
              onChange={(event) => handlePageSizeChange(event.target.value)}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} 条
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SummaryPanel({ title, items }: { title: string; items: { name: string; detail: string }[] }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div className="summary-list" style={{ marginTop: 12 }}>
        {items.map((item) => (
          <div key={item.name} className="summary-item">
            <strong>{item.name}</strong>
            <div className="subtle">{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ChartPanel({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: { label: string; value: number; detail: string; valueLabel?: string; tone?: 'brand' | 'success' | 'warning' | 'danger' }[];
}) {
  const maxValue = items.reduce((current, item) => Math.max(current, item.value), 0) || 1;

  return (
    <section className="panel chart-panel">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="badge">{items.length} bars</span>
      </div>
      <div className="chart-list">
        {items.length ? (
          items.map((item) => {
            const widthPct = Math.max(8, Math.round((item.value / maxValue) * 100));
            return (
              <div key={`${title}-${item.label}`} className="chart-item">
                <div className="chart-item-head">
                  <strong>{item.label}</strong>
                  <span>{item.valueLabel ?? String(item.value)}</span>
                </div>
                <div className="chart-bar-track">
                  <div
                    className={`chart-bar-fill ${item.tone ?? 'brand'}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="subtle">{item.detail}</div>
              </div>
            );
          })
        ) : (
          <div className="summary-item">
            <strong>暂无图表数据</strong>
            <div className="subtle">当前筛选范围没有可绘制的数据。</div>
          </div>
        )}
      </div>
    </section>
  );
}

export function TimelinePanel({ title, items }: { title: string; items: { title: string; detail: string }[] }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div className="timeline" style={{ marginTop: 12 }}>
        {items.map((item) => (
          <div key={item.title} className="timeline-item">
            <strong>{item.title}</strong>
            <div className="subtle">{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
