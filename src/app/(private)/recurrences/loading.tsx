import { PageHeading } from "@/app/(private)/_components/finance-layout";
import { RecurrencesSkeleton } from "./_components/recurrences-skeleton";
export default function Loading() {
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
}
