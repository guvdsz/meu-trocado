"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function ConnectionNotice() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div className="connection-notice fixed top-4 left-1/2 z-[1000] flex w-[min(560px,calc(100%-32px))] -translate-x-1/2 items-center gap-3 rounded-xl border border-[#ddc58f] bg-[#fff8e7] p-4 text-[#674716] shadow-[0_4px_20px_#263c3214] [&_svg]:size-[22px] [&_svg]:shrink-0 [&_p]:m-0 [&_p]:text-[15px] [&_p]:leading-normal [&_strong]:block [&_strong]:font-[650] max-[800px]:top-[calc(80px+env(safe-area-inset-top,0px))]" role="alert">
      <WifiOff aria-hidden="true" />
      <p>
        <strong>Sem conexão com a internet.</strong> Verifique sua conexão para
        continuar.
      </p>
    </div>
  );
}
