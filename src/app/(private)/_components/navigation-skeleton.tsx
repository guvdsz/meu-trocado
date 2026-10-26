import { PageSkeleton } from "./data-skeleton";
import { PageHeading } from "./finance-layout";
import { RecurrencesSkeleton } from "../recurrences/_components/recurrences-skeleton";
import { Skeleton } from "@/app/_components/ui/skeleton";

export function NavigationSkeleton({ path }: { path: string }) {
  if (path.startsWith("/transactions")) return <PageSkeleton history />;
  if (path.startsWith("/recurrences"))
    return (
      <div className="finance-page">
        <PageHeading>
          <div>
            <h1>Recorrências</h1>
            <p>Saídas automáticas e próximos lançamentos</p>
          </div>
        </PageHeading>
        <RecurrencesSkeleton />
      </div>
    );
  if (path.startsWith("/settings"))
    return (
      <div
        className="grid w-full min-w-0 gap-6"
        role="status"
        aria-label="Carregando configurações"
      >
        <div>
          <h1 className="text-3xl font-semibold">Configurações</h1>
          <p className="mt-2 text-muted-foreground">
            Preferências financeiras e formato de exibição
          </p>
        </div>
        <section
          className="grid gap-5 rounded-2xl border bg-white p-4 sm:p-6"
          aria-hidden="true"
        >
          <h2 className="text-lg font-semibold">Moeda e região</h2>
          {[0, 1, 2].map((key) => (
            <div className="grid gap-2" key={key}>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-lg" />
        </section>
      </div>
    );
  return <PageSkeleton />;
}
