import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="Meu Trocado — início"
    >
      <span className="brand-symbol" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>
        meu<span className="brand-weight">trocado</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
