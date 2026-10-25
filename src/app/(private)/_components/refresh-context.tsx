"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RefreshState = {
  busy: boolean;
  setMutating: (value: boolean) => void;
  navigate: (url: string) => void;
  refresh: () => void;
};
const RefreshContext = createContext<RefreshState | null>(null);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mutating, setMutating] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <RefreshContext.Provider
      value={{
        busy: mutating || pending,
        setMutating,
        navigate: (url) =>
          startTransition(() => router.push(url, { scroll: false })),
        refresh: () => startTransition(() => router.refresh()),
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useFinanceRefresh() {
  const value = useContext(RefreshContext);
  if (!value) throw new Error("Finance refresh provider is missing");
  return value;
}
