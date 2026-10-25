import { SummaryGrid, OverviewGrid, AnalysisGrid, PageHeading, PageActions } from "@/app/(private)/_components/finance-layout";
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
            <SummaryGrid>
              <Skeleton className="skeleton-card h-[220px] rounded-2xl max-[650px]:h-40 max-[650px]:first:col-span-full max-[650px]:first:h-[220px]" />
              <Skeleton className="skeleton-card h-[220px] rounded-2xl max-[650px]:h-40 max-[650px]:first:col-span-full max-[650px]:first:h-[220px]" />
              <Skeleton className="skeleton-card h-[220px] rounded-2xl max-[650px]:h-40 max-[650px]:first:col-span-full max-[650px]:first:h-[220px]" />
            </SummaryGrid>
            <OverviewGrid>
              <Skeleton className="skeleton-overview-card h-[204px] rounded-2xl" />
              <Skeleton className="skeleton-overview-card h-[204px] rounded-2xl" />
            </OverviewGrid>
            <AnalysisGrid>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton className="skeleton-analysis-card h-[390px] rounded-2xl" key={index} />
              ))}
            </AnalysisGrid>
          </>
        )}
        {history && (
          <div className="skeleton-table rounded-2xl border bg-white px-6 py-2.5">
            {Array.from({ length: history ? 6 : 1 }, (_, index) => (
              <div className="skeleton-row flex items-center gap-4 py-5 [&+.skeleton-row]:border-t max-[650px]:gap-3" key={index}>
                <Skeleton className="skeleton-avatar size-[42px] shrink-0 rounded-xl" />
                <Skeleton className="skeleton-description h-5 w-[45%] max-[650px]:w-2/5" />
                <Skeleton className="skeleton-amount ml-auto h-[22px] w-[120px] max-[650px]:w-[75px]" />
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
      <div className="finance-page history-page-skeleton [&_.data-skeleton]:min-h-0 [&_.skeleton-table]:border-t max-[650px]:[&_.skeleton-row]:min-h-24">
        <PageHeading>
          <div>
            <h1>Movimentações</h1>
            <p>Histórico de entradas, saídas e ajustes</p>
          </div>
        </PageHeading>
        <PageActions  aria-hidden="true">
          <Skeleton className="skeleton-period mr-auto h-11 w-[190px] rounded-[10px]" />
          <Skeleton className="skeleton-action h-11 w-[175px] rounded-[10px] max-[650px]:w-full" />
          <Skeleton className="skeleton-action h-11 w-[175px] rounded-[10px] max-[650px]:w-full" />
        </PageActions>
        <section className="finance-panel overflow-hidden rounded-2xl border bg-white history-panel [&_.skeleton-table]:rounded-none [&_.skeleton-table]:border-0 [&_.data-skeleton]:min-h-[400px]">
          <div className="history-toolbar grid grid-cols-[minmax(0,1fr)_200px_220px] max-[1150px]:grid-cols-2 max-[1150px]:[&>.filter-search-field]:col-span-full items-end gap-5 px-6 py-[22px] max-[700px]:grid-cols-1 max-[700px]:gap-4 max-[700px]:p-[18px] [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:min-h-11 [&_[data-slot=select-trigger]]:rounded-[10px] [&_[data-slot=select-trigger]]:border-[#c9d3c0] [&_[data-slot=select-trigger]]:px-3 [&_[data-slot=select-trigger]]:py-2.5 [&_[data-slot=select-trigger]]:text-[15px] [&_[data-slot=select-trigger]]:shadow-[0_1px_2px_#29433306]" aria-hidden="true">
            <div className="filter-field flex min-w-0 flex-col gap-2 [&>label]:text-sm [&>label]:leading-normal [&>label]:font-medium [&>label]:text-[#425b38] [&>span]:text-sm [&>span]:leading-normal [&>span]:font-medium [&>span]:text-[#425b38] filter-search-field">
              <span>Descrição</span>
              <Skeleton className="skeleton-filter h-11 w-full rounded-[10px]" />
            </div>
            <div className="filter-field flex min-w-0 flex-col gap-2 [&>label]:text-sm [&>label]:leading-normal [&>label]:font-medium [&>label]:text-[#425b38] [&>span]:text-sm [&>span]:leading-normal [&>span]:font-medium [&>span]:text-[#425b38] filter-type-field">
              <span>Tipo de movimentação</span>
              <Skeleton className="skeleton-filter h-11 w-full rounded-[10px]" />
            </div>
            <div className="filter-field flex min-w-0 flex-col gap-2 text-sm leading-normal font-medium text-[#425b38]">
              <span>Categoria</span>
              <Skeleton className="skeleton-filter h-11 w-full rounded-[10px]" />
            </div>
          </div>
          <DataSkeleton history />
          <div className="history-pagination flex items-center justify-between gap-4 border-t px-6 py-5 text-sm text-[#526649] [&>div]:flex [&>div]:gap-2.5 max-[650px]:flex-col max-[650px]:items-start max-[650px]:gap-3.5 max-[650px]:p-[18px] max-[650px]:[&>div]:w-full max-[650px]:[&>div]:justify-between max-[650px]:[&>span]:text-[13px] max-[650px]:[&_button]:min-w-[104px]" aria-hidden="true">
            <Skeleton className="skeleton-pagination-label h-5 w-[190px]" />
            <Skeleton className="skeleton-pagination-buttons h-11 w-[215px]" />
          </div>
        </section>
      </div>
    );
  return (
    <>
      <div className="page-skeleton-heading mb-[34px] flex justify-between gap-5 max-[650px]:flex-wrap" aria-hidden="true">
        <Skeleton className="skeleton-title h-11 w-[220px]" />
        <Skeleton className="skeleton-control h-11 w-[180px]" />
      </div>
      <DataSkeleton history={history} />
    </>
  );
}
