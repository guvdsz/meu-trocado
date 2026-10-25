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
    <div className="unavailable-state grid min-h-[min(620px,calc(100svh-180px))] place-items-center py-10 max-[650px]:min-h-[calc(100svh-180px)] max-[650px]:py-5">
      <section
        className="unavailable-state-card flex w-full max-w-[500px] flex-col items-center gap-6 rounded-[20px] border bg-white p-9 text-center shadow-[0_8px_32px_#263c3206] [&>button]:min-h-[46px] [&>button]:min-w-[190px] max-[650px]:gap-[22px] max-[650px]:px-[22px] max-[650px]:py-7 max-[650px]:[&>button]:w-full"
        aria-labelledby="unavailable-title"
        aria-busy={pending}
      >
        <span className="unavailable-state-icon grid size-16 place-items-center rounded-[18px] bg-[#f8eee5] text-[#9b603d] [&_svg]:size-7">
          <CircleAlert aria-hidden="true" />
        </span>
        <div className="unavailable-state-copy [&_h1]:m-0 [&_h1]:text-2xl [&_h1]:leading-[1.35] [&_h1]:font-semibold [&_h1]:tracking-[-0.6px] [&_h1]:text-balance [&_p]:mt-3 [&_p]:text-base [&_p]:leading-[1.6] [&_p]:text-pretty [&_p]:text-muted-foreground max-[650px]:[&_h1]:text-[22px]">
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
            <LoaderCircle className="spinner animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <RotateCcw aria-hidden="true" />
          )}
          {pending ? "Tentando novamente…" : "Tentar novamente"}
        </Button>
      </section>
    </div>
  );
}
