import { Skeleton } from "@/app/_components/ui/skeleton";

export function DataSkeleton({ history = false }: { history?: boolean }) {
  return (
    <div
      className="data-skeleton"
      role="status"
      aria-label="Atualizando informações financeiras"
    >
      <span className="sr-only">Atualizando dados…</span>
      <div aria-hidden="true">
        {!history && (
          <>
            <div className="finance-summary">
              <Skeleton className="skeleton-card" />
              <Skeleton className="skeleton-card" />
              <Skeleton className="skeleton-card" />
            </div>
            <div className="finance-overview-row">
              <Skeleton className="skeleton-overview-card" />
              <Skeleton className="skeleton-overview-card" />
            </div>
            <div className="finance-analysis-grid">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton className="skeleton-analysis-card" key={index} />
              ))}
            </div>
          </>
        )}
        {history && (
          <div className="skeleton-table">
            {Array.from({ length: history ? 6 : 1 }, (_, index) => (
              <div className="skeleton-row" key={index}>
                <Skeleton className="skeleton-avatar" />
                <Skeleton className="skeleton-description" />
                <Skeleton className="skeleton-amount" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageSkeleton({ history = false }: { history?: boolean }) {
  if (history)
    return (
      <div className="finance-page history-page-skeleton">
        <div className="finance-page-heading">
          <div>
            <h1>Movimentações</h1>
            <p>Histórico de entradas, saídas e ajustes</p>
          </div>
        </div>
        <div className="finance-actions" aria-hidden="true">
          <Skeleton className="skeleton-period" />
          <Skeleton className="skeleton-action" />
          <Skeleton className="skeleton-action" />
        </div>
        <section className="finance-panel history-panel">
          <div className="history-toolbar" aria-hidden="true">
            <div className="filter-field filter-search-field">
              <span>Descrição</span>
              <Skeleton className="skeleton-filter" />
            </div>
            <div className="filter-field filter-type-field">
              <span>Tipo de movimentação</span>
              <Skeleton className="skeleton-filter" />
            </div>
          </div>
          <DataSkeleton history />
          <div className="history-pagination" aria-hidden="true">
            <Skeleton className="skeleton-pagination-label" />
            <Skeleton className="skeleton-pagination-buttons" />
          </div>
        </section>
      </div>
    );
  return (
    <>
      <div className="page-skeleton-heading" aria-hidden="true">
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-control" />
      </div>
      <DataSkeleton history={history} />
    </>
  );
}
