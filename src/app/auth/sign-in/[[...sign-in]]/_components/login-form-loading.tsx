import { LoaderCircle } from "lucide-react";

export function LoginFormLoading() {
  return (
    <div className="login-widget-loading flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-[#e2e8da] bg-[#f7f9f3] px-4 py-6 text-center text-sm text-[#526548] [&_svg]:text-[#557e36]" role="status" aria-live="polite">
      <LoaderCircle className="spinner animate-spin motion-reduce:animate-none" size={24} aria-hidden="true" />
      <span>Preparando seu acesso…</span>
    </div>
  );
}
