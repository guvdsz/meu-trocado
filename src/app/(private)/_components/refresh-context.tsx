"use client";

import {
  createContext,
  useContext,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type RefreshState = {
  busy: boolean;
  setMutating: (value: boolean) => void;
  navigate: (url: string) => void;
  refresh: () => void;
  navigationPath: string | null;
  runMutation: <T>(work: () => Promise<T>) => Promise<T>;
};
const RefreshContext = createContext<RefreshState | null>(null);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useOptimistic(pathname);
  const [mutating, setMutating] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <RefreshContext.Provider
      value={{
        busy: mutating || pending,
        navigationPath: optimisticPath !== pathname ? optimisticPath : null,
        setMutating,
        navigate: (url) =>
          startTransition(async () => {
            setOptimisticPath(url.split("?")[0]);
            await router.push(url, { scroll: false });
          }),
        refresh: () => startTransition(() => router.refresh()),
        runMutation: (work) =>
          new Promise((resolve, reject) => {
            startTransition(async () => {
              try {
                resolve(await work());
              } catch (error) {
                reject(error);
              }
            });
          }),
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
