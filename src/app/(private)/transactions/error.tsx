"use client";
import { UnavailableState } from "@/app/_components/shared/unavailable-state";
export default function HistoryError({ retry }: { retry: () => void }) {
  return (
    <UnavailableState
      title="Não foi possível carregar o histórico"
      retry={retry}
    />
  );
}
