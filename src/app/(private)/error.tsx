"use client";
import { UnavailableState } from "@/app/_components/shared/unavailable-state";

export default function DashboardError({ retry }: { retry: () => void }) {
  return <UnavailableState retry={retry} />;
}
