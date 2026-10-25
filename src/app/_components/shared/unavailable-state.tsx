"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/app/_components/ui/button";

export function UnavailableState({
  title = "Não foi possível carregar seus dados",
  description = "Verifique sua conexão e tente novamente em instantes.",
  retry,
}: {
  title?: string;
  description?: string;
  retry?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="unavailable-state">
      <section
        className="unavailable-state-card"
        aria-labelledby="unavailable-title"
        aria-busy={pending}
      >
        <span className="unavailable-state-icon">
          <CircleAlert aria-hidden="true" />
        </span>
        <div className="unavailable-state-copy">
          <h1 id="unavailable-title">{title}</h1>
          <p>{description}</p>
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(() => (retry ? retry() : router.refresh()))
          }
        >
          {pending ? (
            <LoaderCircle className="spinner" aria-hidden="true" />
          ) : (
            <RotateCcw aria-hidden="true" />
          )}
          {pending ? "Tentando novamente…" : "Tentar novamente"}
        </Button>
      </section>
    </div>
  );
}
