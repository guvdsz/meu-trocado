import { Skeleton } from "@/app/_components/ui/skeleton";
export function RecurrencesSkeleton() {
  return (
    <div role="status" aria-label="Carregando recorrências">
      <span className="sr-only">Carregando recorrências</span>
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="mb-4 h-40 w-full rounded-2xl" />
      ))}
    </div>
  );
}
