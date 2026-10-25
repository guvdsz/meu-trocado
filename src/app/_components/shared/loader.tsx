import { LoaderCircle } from "lucide-react";

export default function Loader() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="loading-content">
        <span className="loading-symbol">
          <LoaderCircle className="spinner" size={34} aria-hidden="true" />
        </span>
        <p>Organizando seu trocado…</p>
      </div>
    </div>
  );
}
