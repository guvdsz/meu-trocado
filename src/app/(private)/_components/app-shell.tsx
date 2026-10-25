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
        className="account-trigger"
        aria-label={`Abrir menu da conta de ${name}`}
      >
        <span className="account-avatar" aria-hidden="true">
          {name.slice(0, 1).toLocaleUpperCase("pt-BR")}
        </span>
        <span className="account-text">
          <strong>{name}</strong>
          <span title={email}>{email}</span>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        className="account-popover"
        align="start"
        sideOffset={10}
        aria-label="Opções da conta"
      >
        <Button
          variant="ghost"
          className="menu-action"
          onClick={() => clerk.openUserProfile()}
        >
          <Settings aria-hidden="true" />
          Gerenciar conta
        </Button>
        <Button
          variant="ghost"
          className="menu-action logout-action"
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
            <LoaderCircle className="spinner" aria-hidden="true" />
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
  const sidebar = (
    <>
      <Brand />
      <nav className="finance-navigation" aria-label="Navegação principal">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={!isHistory ? "selected" : ""}
          aria-current={!isHistory ? "page" : undefined}
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
      </nav>
      <div className="finance-account">
        <UserMenu name={name} email={email} />
      </div>
    </>
  );
  return (
    <RefreshProvider>
      <div className="finance-shell">
        <a className="skip-link" href="#main-content">
          Pular para o conteúdo
        </a>
        <aside className="finance-sidebar" aria-label="Menu lateral">
          {sidebar}
        </aside>
        <div className="finance-workspace">
          <header className="finance-topbar">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mobile-navigation-trigger"
                    aria-label="Abrir navegação"
                  />
                }
              >
                <Menu aria-hidden="true" />
              </SheetTrigger>
              <SheetContent side="left" className="mobile-sidebar">
                <SheetTitle className="sr-only">Navegação</SheetTitle>
                <SheetDescription className="sr-only">
                  Acesse a visão geral, o histórico e sua conta.
                </SheetDescription>
                {sidebar}
              </SheetContent>
            </Sheet>
            <span className="topbar-page-title">
              {isHistory ? "Movimentações" : "Visão geral"}
            </span>
            <span className="topbar-brand">Meu Trocado</span>
          </header>
          <main id="main-content" tabIndex={-1} className="finance-content">
            {children}
          </main>
        </div>
      </div>
    </RefreshProvider>
  );
}
