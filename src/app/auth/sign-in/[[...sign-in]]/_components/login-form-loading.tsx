import { LoaderCircle } from "lucide-react";

export function LoginFormLoading() {
  return (
    <div className="login-widget-loading" role="status" aria-live="polite">
      <LoaderCircle className="spinner" size={24} aria-hidden="true" />
      <span>Preparando seu acesso…</span>
    </div>
  );
}
