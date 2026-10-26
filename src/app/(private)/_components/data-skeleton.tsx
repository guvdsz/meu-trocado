import { SummaryGrid, OverviewGrid, AnalysisGrid } from "@/app/(private)/_components/finance-layout";
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

export function PageSkeleton() {
  return (
    <div className="page-skeleton">
      <div className="page-skeleton-heading mb-[34px] flex justify-between gap-5 max-[650px]:flex-wrap" aria-hidden="true">
        <Skeleton className="skeleton-title h-11 w-[220px]" />
        <Skeleton className="skeleton-control h-11 w-[180px]" />
      </div>
      <DataSkeleton />
    </div>
  );
}
