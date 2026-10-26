"use client";

import { PageHeading } from "@/app/(private)/_components/finance-layout";

import { categoryLabels, transactionCategories } from "@schemas/transaction/category";
import {
  ChevronLeft,
  ChevronRight,
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
import { ActivityTable } from "../../_components/activity-table";
import { MonthPicker } from "../../_components/month-picker";
import { DataSkeleton } from "../../_components/data-skeleton";
import { useFinanceRefresh } from "../../_components/refresh-context";
import type { HistoryData } from "@/db/queries/history";
import {
  HISTORY_PAGE_SIZE,
  type HistoryFilters,
} from "@/db/queries/financial-types";

const types = [
  { value: "all", label: "Todos os tipos" },
  { value: "income", label: "Entradas" },
  { value: "expense", label: "Saídas" },
  { value: "adjustment", label: "Ajustes de saldo" },
];
const categories = [
  { value: "all", label: "Todas as categorias" },
  ...transactionCategories.map((value) => ({ value, label: categoryLabels[value] })),
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
  function update(patch: Partial<HistoryFilters>) {
    const next = { ...filters, page: 1, ...patch };
    const query = new URLSearchParams({
      month: next.month,
      type: next.type,
      category: next.category,
      q: next.query,
      page: String(next.page),
    });
    navigate(`/transactions?${query}`);
  }
  const lastPage = Math.max(1, Math.ceil(data.total / HISTORY_PAGE_SIZE));
  return (
    <div className="finance-page">
      <PageHeading>
        <div>
          <h1>Movimentações</h1>
          <p>Histórico de entradas, saídas e ajustes</p>
        </div>
      </PageHeading>
      <section className="finance-panel @container/history overflow-hidden rounded-2xl border bg-white history-panel [&_.skeleton-table]:rounded-none [&_.skeleton-table]:border-0 [&_.data-skeleton]:min-h-[400px]">
        <div className="history-toolbar grid grid-cols-1 items-end gap-5 px-6 py-[22px] @min-[540px]/history:grid-cols-2 @min-[540px]/history:[&>.filter-search-field]:col-span-full @min-[740px]/history:grid-cols-[minmax(0,1fr)_200px_220px] @min-[1000px]/history:grid-cols-[minmax(0,1fr)_195px_200px_220px] @min-[1000px]/history:[&>.filter-search-field]:col-span-1 max-[700px]:gap-4 max-[700px]:p-[18px] [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:min-h-11 [&_[data-slot=select-trigger]]:rounded-[10px] [&_[data-slot=select-trigger]]:border-[#c9d3c0] [&_[data-slot=select-trigger]]:px-3 [&_[data-slot=select-trigger]]:py-2.5 [&_[data-slot=select-trigger]]:text-[15px] [&_[data-slot=select-trigger]]:shadow-[0_1px_2px_#29433306] [&_.period-trigger]:w-full [&_.period-trigger]:min-w-0 [&_.period-trigger]:rounded-[10px] [&_.period-trigger]:text-[15px]!">
          <div className="filter-field flex min-w-0 flex-col gap-2 [&>label]:text-sm [&>label]:leading-normal [&>label]:font-medium [&>label]:text-[#425b38] [&>span]:text-sm [&>span]:leading-normal [&>span]:font-medium [&>span]:text-[#425b38] filter-search-field">
            <label htmlFor="history-search">Descrição</label>
            <form
              className="history-search flex w-full min-w-0 flex-1 gap-2 [&_input]:h-11 [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:flex-1 [&_input]:rounded-[10px] [&_input]:border-[#c9d3c0] [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-[15px] [&_input]:shadow-[0_1px_2px_#29433306] [&_input::placeholder]:text-[#64735b] [&_input::placeholder]:opacity-100 [&_button]:h-11 [&_button]:shrink-0 [&_button]:border-[#c9d3c0] [&_button]:bg-[#f8faf5]"
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
          <div className="filter-field filter-period-field flex min-w-0 flex-col gap-2 [&>span]:text-sm [&>span]:leading-normal [&>span]:font-medium [&>span]:text-[#425b38]">
            <span>Período</span>
            <MonthPicker
              value={filters.month}
              today={today}
              onChange={(month) => update({ month })}
            />
          </div>
          <div className="filter-field flex min-w-0 flex-col gap-2 [&>label]:text-sm [&>label]:leading-normal [&>label]:font-medium [&>label]:text-[#425b38] [&>span]:text-sm [&>span]:leading-normal [&>span]:font-medium [&>span]:text-[#425b38] filter-type-field">
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
              <SelectContent alignItemWithTrigger={false}>
                {types.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="filter-field flex min-w-0 flex-col gap-2 [&>label]:text-sm [&>label]:leading-normal [&>label]:font-medium [&>label]:text-[#425b38] filter-category-field">
            <label htmlFor="history-category">Categoria</label>
            <Select
              items={categories}
              value={filters.category}
              onValueChange={(category) => {
                if (category) update({ category: category as HistoryFilters["category"] });
              }}
              disabled={busy}
            >
              <SelectTrigger id="history-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
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
            <div className="finance-empty flex min-h-[180px] flex-col items-center justify-center gap-3 px-6 py-11 text-center [&_h2]:m-0 [&_h2]:text-lg [&_h2]:font-[550] [&_h3]:m-0 [&_h3]:text-lg [&_h3]:font-[550] [&_h1]:m-0 [&_h1]:text-[26px] [&_h1]:font-semibold [&_p]:m-0 [&_p]:max-w-[500px] [&_p]:text-[15px] [&_p]:text-[#53634a] [&>svg]:mb-[3px] [&>svg]:text-[#78985e]">
              <Wallet size={28} aria-hidden="true" />
              <h2>Nenhuma movimentação encontrada</h2>
              <p>Altere os filtros ou registre uma entrada ou saída.</p>
              {(filters.query || filters.type !== "all" || filters.category !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => update({ query: "", type: "all", category: "all" })}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="history-pagination flex items-center justify-between gap-4 border-t px-6 py-5 text-sm text-[#526649] [&>div]:flex [&>div]:gap-2.5 max-[650px]:flex-col max-[650px]:items-start max-[650px]:gap-3.5 max-[650px]:p-[18px] max-[650px]:[&>div]:w-full max-[650px]:[&>div]:justify-between max-[650px]:[&>span]:text-[13px] max-[650px]:[&_button]:min-w-[104px]">
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
    </div>
  );
}
