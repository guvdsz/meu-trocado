import { LoaderCircle } from "lucide-react";

export default function Loader() {
  return (
    <div className="page-loading grid min-h-svh place-items-center bg-background" role="status" aria-live="polite">
      <div className="loading-content flex flex-col items-center gap-[18px] text-[#3d5e30] [&_p]:m-0 [&_p]:text-base [&_p]:font-medium">
        <span className="loading-symbol grid size-[76px] place-items-center rounded-[22px] border border-[#d6e2c6] bg-[#e9f0dc]">
          <LoaderCircle className="spinner animate-spin motion-reduce:animate-none" size={34} aria-hidden="true" />
        </span>
        <p>Organizando seu trocado…</p>
      </div>
    </div>
  );
}
