import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageHeading({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "finance-page-heading mb-6 flex items-center justify-between gap-6 [&_h1]:mb-2 [&_h1]:text-[34px]",
        "[&_h1]:leading-[1.2] [&_h1]:font-semibold [&_h1]:tracking-[-1.2px] [&_p]:m-0 [&_p]:text-base [&_p]:text-[#59694f] max-[950px]:flex-wrap max-[950px]:items-start",
        "max-[800px]:items-center max-[650px]:mb-5 max-[650px]:items-start max-[650px]:gap-[18px] max-[650px]:[&_h1]:text-[29px] max-[650px]:[&_p]:text-[15px]",
        className,
      )}
      {...props}
    />
  );
}

export function PageActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "finance-actions mb-6 flex min-h-11 items-center justify-end gap-3 [&>.period-trigger]:mr-auto",
        "[&>.period-trigger]:min-w-[190px] max-[650px]:grid max-[650px]:grid-cols-2 max-[650px]:items-stretch max-[650px]:gap-2.5 max-[650px]:[&>.period-trigger]:col-span-full max-[650px]:[&>.period-trigger]:mr-0 max-[650px]:[&>.period-trigger]:w-full",
        "max-[650px]:[&>.period-trigger]:min-w-0 max-[650px]:[&>.period-trigger]:justify-start! max-[650px]:[&>.skeleton-period]:col-span-full max-[650px]:[&>.skeleton-period]:mr-0 max-[650px]:[&>.skeleton-period]:w-full max-[650px]:[&>button]:w-full max-[650px]:[&>button]:min-w-0 max-[650px]:[&>button]:px-3",
        "max-[650px]:[&>button]:text-sm max-[360px]:[&>button]:gap-1.5 max-[360px]:[&>button]:px-2 max-[360px]:[&>button]:text-[13px]",
        className,
      )}
      {...props}
    />
  );
}

export function SummaryGrid({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "finance-summary mb-6 grid grid-cols-3 items-stretch gap-5 max-[1150px]:gap-4 max-[950px]:grid-cols-2",
        "min-[651px]:max-[800px]:grid-cols-3 max-[650px]:grid-cols-1 max-[650px]:gap-3.5",
        className,
      )}
      {...props}
    />
  );
}

export function OverviewGrid({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "finance-overview-row mb-6 grid grid-cols-[1fr_1.7fr] gap-6 [&>*]:min-w-0 max-[1100px]:grid-cols-[1fr_1.4fr] max-[650px]:mb-4",
        "max-[650px]:grid-cols-[minmax(0,1fr)] max-[650px]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

export function AnalysisGrid({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "finance-analysis-grid mb-6 grid grid-cols-2 items-stretch gap-6 [&>*]:min-w-0 [&>.monthly-analysis]:self-start",
        "max-[850px]:grid-cols-[minmax(0,1fr)] max-[650px]:mb-4 max-[650px]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

