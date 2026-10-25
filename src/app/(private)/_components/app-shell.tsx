"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import {
  ChevronDown,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  Settings,
  LoaderCircle,
  Repeat,
} from "lucide-react";
import { Brand } from "@/app/_components/shared/brand";
import { Button } from "@/app/_components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/_components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/app/_components/ui/sheet";
import { toast } from "@/app/_components/ui/toast";
import { RefreshProvider } from "./refresh-context";

function UserMenu({ name, email }: { name: string; email: string }) {
  const clerk = useClerk();
  const [signingOut, setSigningOut] = useState(false);
  return (
    <Popover>
      <PopoverTrigger
        className="account-trigger flex w-full items-center gap-2.5 rounded-xl border border-[#cfdac4] bg-[#f7f9f2] p-3 text-left text-[#294333] transition-[background,box-shadow] duration-150 hover:bg-[#eaf1df] hover:shadow-[0_2px_7px_#2943330a] data-popup-open:bg-[#eaf1df] data-popup-open:shadow-[0_2px_7px_#2943330a]"
        aria-label={`Abrir menu da conta de ${name}`}
      >
        <span className="account-avatar grid size-10 shrink-0 place-items-center rounded-full bg-[#d9e7c3] text-lg font-[650] text-[#3d5d2e]" aria-hidden="true">
          {name.slice(0, 1).toLocaleUpperCase("pt-BR")}
        </span>
        <span className="account-text flex min-w-0 flex-1 flex-col gap-[3px] [&_strong]:text-[15px] [&_strong]:font-semibold [&>span]:truncate [&>span]:text-[13px] [&>span]:text-[#52634a]">
          <strong>{name}</strong>
          <span title={email}>{email}</span>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        className="account-popover w-[245px] gap-1 p-2"
        align="start"
        sideOffset={10}
        aria-label="Opções da conta"
      >
        <Button
          variant="ghost"
          className="menu-action w-full justify-start!"
          onClick={() => clerk.openUserProfile()}
        >
          <Settings aria-hidden="true" />
          Gerenciar conta
        </Button>
        <Button
          variant="ghost"
          className="menu-action w-full justify-start! logout-action text-[#963e2e]"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
              await clerk.signOut({ redirectUrl: "/auth/sign-in" });
            } catch {
              setSigningOut(false);
              toast.add({
                title: "Não foi possível sair. Tente novamente.",
                type: "error",
              });
            }
          }}
        >
          {signingOut ? (
            <LoaderCircle className="spinner animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <LogOut aria-hidden="true" />
          )}
          {signingOut ? "Saindo…" : "Sair da conta"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({
  children,
  name,
  email,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHistory = pathname.startsWith("/transactions");
  const isSettings = pathname.startsWith("/settings");
  const isRecurring = pathname.startsWith("/recurrences");
  const sidebar = (
    <>
      <Brand />
      <nav className="finance-navigation flex flex-col gap-2 [&_a]:flex [&_a]:min-h-12 [&_a]:items-center [&_a]:gap-3 [&_a]:rounded-[10px] [&_a]:px-4 [&_a]:py-3 [&_a]:text-[15px] [&_a]:font-medium [&_a]:text-[#53634b] [&_a:hover]:bg-[#f0f4e9] [&_a[aria-current=page]]:bg-secondary [&_a[aria-current=page]]:font-[650] [&_a[aria-current=page]]:text-primary [&_svg]:size-[21px] [&_svg]:shrink-0" aria-label="Navegação principal">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={!isHistory && !isRecurring && !isSettings ? "selected" : ""}
          aria-current={!isHistory && !isRecurring && !isSettings ? "page" : undefined}
        >
          <LayoutDashboard aria-hidden="true" />
          Visão geral
        </Link>
        <Link
          href="/transactions"
          onClick={() => setMobileOpen(false)}
          className={isHistory ? "selected" : ""}
          aria-current={isHistory ? "page" : undefined}
        >
          <ListFilter aria-hidden="true" />
          Movimentações
        </Link>
        <Link
          href="/recurrences"
          onClick={() => setMobileOpen(false)}
          className={isRecurring ? "selected" : ""}
          aria-current={isRecurring ? "page" : undefined}
        >
          <Repeat aria-hidden="true" />
          Recorrências
        </Link>
        <Link href="/settings" onClick={() => setMobileOpen(false)} aria-current={isSettings ? "page" : undefined}><Settings aria-hidden="true" />Configurações</Link>
      </nav>
      <div className="finance-account mt-auto pt-6">
        <UserMenu name={name} email={email} />
      </div>
    </>
  );
  return (
    <RefreshProvider>
      <div className="finance-shell flex min-h-svh">
        <a className="skip-link fixed top-3 left-3 z-[1000] -translate-y-[180%] rounded-[10px] bg-primary px-5 py-3.5 text-white focus:translate-y-0" href="#main-content">
          Pular para o conteúdo
        </a>
        <aside className="finance-sidebar sticky top-0 flex h-svh w-[260px] shrink-0 flex-col gap-9 overflow-y-auto border-r bg-white px-[22px] pt-[34px] pb-[22px] max-[1150px]:w-[230px] max-[1150px]:px-4 max-[800px]:hidden" aria-label="Menu lateral">
          {sidebar}
        </aside>
        <div className="finance-workspace min-w-0 flex-1 max-[800px]:pt-[calc(76px+env(safe-area-inset-top,0px))]">
          <header className="finance-topbar flex h-[76px] items-center gap-3 border-b px-10 text-[15px] font-[550] max-[1150px]:px-7 max-[800px]:fixed max-[800px]:top-[calc(12px+env(safe-area-inset-top,0px))] max-[800px]:left-[calc(16px+env(safe-area-inset-left,0px))] max-[800px]:z-40 max-[800px]:h-[52px] max-[800px]:w-max max-[800px]:max-w-[calc(100%-32px-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px))] max-[800px]:gap-1.5 max-[800px]:rounded-2xl max-[800px]:border max-[800px]:bg-[#fffffff5] max-[800px]:py-1 max-[800px]:pr-4 max-[800px]:pl-1 max-[800px]:shadow-[0_4px_16px_#263c3214] max-[800px]:backdrop-blur-[12px]">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mobile-navigation-trigger hidden! max-[800px]:inline-flex! max-[800px]:size-11 max-[800px]:shrink-0 max-[800px]:rounded-xl"
                    aria-label="Abrir navegação"
                  />
                }
              >
                <Menu aria-hidden="true" />
              </SheetTrigger>
              <SheetContent side="left" className="mobile-sidebar w-[min(310px,85vw)]! max-w-[310px]! gap-9 px-5 pt-8 pb-5 [&>.brand]:mr-[30px]">
                <SheetTitle className="sr-only">Navegação</SheetTitle>
                <SheetDescription className="sr-only">
                  Acesse a visão geral, o histórico e sua conta.
                </SheetDescription>
                {sidebar}
              </SheetContent>
            </Sheet>
            <span className="topbar-page-title max-[800px]:truncate">
              {isSettings ? "Configurações" : isHistory
                ? "Movimentações"
                : isRecurring
                  ? "Recorrências"
                  : "Visão geral"}
            </span>
            <span className="topbar-brand ml-auto text-sm font-normal text-[#5e6e56] max-[800px]:hidden">Meu Trocado</span>
          </header>
          <main id="main-content" tabIndex={-1} className="finance-content mx-auto max-w-[1440px] px-10 pt-[38px] pb-12 outline-none max-[1150px]:px-7 max-[1150px]:py-[30px] max-[800px]:px-[22px] max-[800px]:py-7 max-[650px]:px-4 max-[650px]:pt-[26px] max-[650px]:pb-9">
            {children}
          </main>
        </div>
      </div>
    </RefreshProvider>
  );
}
