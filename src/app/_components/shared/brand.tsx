import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand inline-flex items-center gap-2.5 text-[25px] font-normal tracking-[-1.4px] whitespace-nowrap ${light ? "brand-light text-white [&_.brand-dot]:text-[#d9ee9b] [&_.brand-symbol_span]:border-primary" : ""}`}
      aria-label="Meu Trocado — início"
    >
      <span className="brand-symbol relative inline-block h-[35px] w-[31px] [&_span]:absolute [&_span]:top-[15px] [&_span]:left-px [&_span]:h-3 [&_span]:w-[22px] [&_span]:rotate-[-24deg] [&_span]:rounded-full [&_span]:border-2 [&_span]:border-white [&_span]:bg-[#345a45] [&_span:nth-child(2)]:top-[9px] [&_span:nth-child(2)]:left-[5px] [&_span:nth-child(2)]:bg-[#87a26d] [&_span:nth-child(3)]:top-[3px] [&_span:nth-child(3)]:left-[9px] [&_span:nth-child(3)]:bg-[#c7de93]" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>
        meu<span className="brand-weight font-[750]">trocado</span>
        <span className="brand-dot text-[#91aa55]">.</span>
      </span>
    </Link>
  );
}
