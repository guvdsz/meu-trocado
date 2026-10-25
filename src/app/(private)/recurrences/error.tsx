"use client";
import { UnavailableState } from "@/app/_components/shared/unavailable-state";
export default function RecurrencesError({ retry }: { retry: () => void }) {
  return (
    <UnavailableState
      title="Não foi possível carregar as recorrências"
      retry={retry}
    />
  );
}
