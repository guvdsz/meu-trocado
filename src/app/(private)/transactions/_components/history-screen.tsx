"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { toast } from "@/app/_components/ui/toast";
import { ActivityTable } from "../../_components/activity-table";
import { FinanceDialog } from "../../_components/finance-dialog";
import { MonthPicker } from "../../_components/month-picker";
import { DataSkeleton } from "../../_components/data-skeleton";
import { useFinanceRefresh } from "../../_components/refresh-context";
import type { HistoryData } from "@/db/queries/history";
import {
  HISTORY_PAGE_SIZE,
  type HistoryFilters,
} from "@/db/queries/history-sql";

const types = [
  { value: "all", label: "Todos os tipos" },
  { value: "income", label: "Entradas" },
  { value: "expense", label: "Saídas" },
  { value: "adjustment", label: "Ajustes de saldo" },
];

export function HistoryScreen({
  data,
  filters,
  today,
}: {
  data: HistoryData;
  filters: HistoryFilters;
  today: string;
}) {
  const { busy, navigate } = useFinanceRefresh();
  const [mode, setMode] = useState<"income" | "expense" | null>(null);
  function update(patch: Partial<HistoryFilters>) {
    const next = { ...filters, page: 1, ...patch };
    const query = new URLSearchParams({
      month: next.month,
      type: next.type,
      q: next.query,
      page: String(next.page),
    });
    navigate(`/transactions?${query}`);
  }
  const lastPage = Math.max(1, Math.ceil(data.total / HISTORY_PAGE_SIZE));
  return (
    <div className="finance-page">
      <div className="finance-page-heading">
        <div>
          <h1>Movimentações</h1>
          <p>Histórico de entradas, saídas e ajustes</p>
        </div>
      </div>
      <div className="finance-actions">
        <MonthPicker
          value={filters.month}
          today={today}
          onChange={(month) => update({ month })}
        />
        <Button
          variant="outline"
          onClick={() => setMode("income")}
          disabled={busy}
        >
          <ArrowDownLeft aria-hidden="true" />
          Adicionar entrada
        </Button>
        <Button onClick={() => setMode("expense")} disabled={busy}>
          <Plus aria-hidden="true" />
          Adicionar saída
        </Button>
      </div>
      <section className="finance-panel history-panel">
        <div className="history-toolbar">
          <div className="filter-field filter-search-field">
            <label htmlFor="history-search">Descrição</label>
            <form
              className="history-search"
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get("query");
                update({
                  query: typeof value === "string" ? value.trim() : "",
                });
              }}
              role="search"
            >
              <Input
                id="history-search"
                name="query"
                type="search"
                placeholder="Buscar por descrição"
                aria-label="Buscar por descrição"
                defaultValue={filters.query}
                key={filters.query}
                maxLength={160}
              />
              <Button type="submit" variant="outline" disabled={busy}>
                <Search aria-hidden="true" />
                <span className="search-button-label">Buscar</span>
              </Button>
            </form>
          </div>
          <div className="filter-field filter-type-field">
            <label htmlFor="history-type">Tipo de movimentação</label>
            <Select
              items={types}
              value={filters.type}
              onValueChange={(type) => {
                if (type) update({ type: type as HistoryFilters["type"] });
              }}
              disabled={busy}
            >
              <SelectTrigger
                id="history-type"
                aria-label="Tipo de movimentação"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div aria-busy={busy}>
          {busy ? (
            <DataSkeleton history />
          ) : data.activity.length ? (
            <ActivityTable
              activity={data.activity}
              label="Histórico de movimentações do período"
            />
          ) : (
            <div className="finance-empty">
              <Wallet size={28} aria-hidden="true" />
              <h2>Nenhuma movimentação encontrada</h2>
              <p>Altere os filtros ou registre uma entrada ou saída.</p>
              {(filters.query || filters.type !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => update({ query: "", type: "all" })}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="history-pagination">
          <span aria-live="polite">
            {data.total} {data.total === 1 ? "registro" : "registros"} · Página{" "}
            {filters.page} de {lastPage}
          </span>
          <div>
            <Button
              variant="outline"
              disabled={busy || filters.page === 1}
              onClick={() => update({ page: filters.page - 1 })}
            >
              <ChevronLeft aria-hidden="true" />
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={busy || filters.page >= lastPage}
              onClick={() => update({ page: filters.page + 1 })}
            >
              Próxima
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
      {mode && (
        <FinanceDialog
          mode={mode}
          today={today}
          balance={data.account.balance}
          version={data.account.version}
          onClose={() => setMode(null)}
          onSuccess={() => {
            toast.add({
              title: mode === "income" ? "Entrada salva" : "Saída salva",
              type: "success",
            });
            setMode(null);
          }}
        />
      )}
    </div>
  );
}
