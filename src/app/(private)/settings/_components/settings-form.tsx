"use client";

import { timeZones } from "@/lib/time-zones";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/app/_components/ui/button";
import { toast } from "@/app/_components/ui/toast";
import { LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/_components/ui/dialog";
import { currencies, currencyNames, type Currency } from "@/lib/preferences";
import { formatMoney } from "@/lib/financial";
import { usePreferences } from "../../_components/preferences-context";
import { saveSettingsAction } from "../_actions/save-settings";

const subscribeToDeviceZone = () => () => {};
const readDeviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SettingsForm({ mandatory = false }: { mandatory?: boolean }) {
  const preferences = usePreferences();
  const router = useRouter();
  const clerk = useClerk();
  const [currency, setCurrency] = useState(preferences.configured ? preferences.currency ?? "" : "");
  // Keep hydration deterministic, then suggest the device zone for onboarding.
  // The suggestion is persisted only when the user confirms the form.
  const deviceZone = useSyncExternalStore(subscribeToDeviceZone, readDeviceZone, () => preferences.timeZone);
  const [selectedTimeZone, setTimeZone] = useState<string | null>(preferences.configured ? preferences.timeZone : null);
  const timeZone = selectedTimeZone ?? deviceZone;
  const [locale, setLocale] = useState(preferences.locale);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [request, setRequest] = useState<{ payload: string; id: string } | null>(null);
  const reset = !!currency && currency !== preferences.currency && (!!preferences.currency || !!preferences.hasFinancialData);
  const zones: string[] = ["UTC", ...timeZones];
  if (!zones.includes(timeZone)) zones.push(timeZone);
  const selectClass = "h-12 w-full rounded-lg border bg-white px-3 text-base text-foreground focus:outline-2 focus:outline-primary";
  const content = <form className="grid gap-5" onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    const payload = { currency, timeZone, locale, expectedSettingsVersion: preferences.settingsVersion, confirmReset: reset && confirmed };
    const serialized = JSON.stringify(payload);
    const id = request?.payload === serialized ? request.id : crypto.randomUUID();
    setRequest({ payload: serialized, id });
    setBusy(true); setMessage("");
    try {
      const result = await saveSettingsAction({ ...payload, requestId: id });
      if (result.success) {
        toast.add({ title: result.message, type: "success" });
        try { localStorage.setItem("finance-settings-changed", crypto.randomUUID()); } catch { /* Storage is optional. */ }
        router.refresh();
      } else setMessage(result.message);
    } catch { setMessage("A conexão falhou. Confira sua internet e tente novamente."); }
    finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="grid min-w-0 gap-5">
      <div className="grid gap-2 font-medium"><label htmlFor="settings-currency">Moeda</label>
        <select id="settings-currency" className={selectClass} required value={currency} onChange={event => { setCurrency(event.target.value); setConfirmed(false); }}>
          <option value="" disabled>Selecione sua moeda</option>
          {currencies.map(code => <option key={code} value={code}>{code} — {currencyNames[code]}</option>)}
        </select>
      </div>
      {currency && <p className="text-sm text-muted-foreground">Exemplo: {formatMoney("1234.56", currency, locale)}</p>}
      <div className="grid gap-2 font-medium"><label htmlFor="settings-time-zone">Fuso horário</label>
        <select id="settings-time-zone" className={selectClass} value={timeZone} onChange={event => setTimeZone(event.target.value)}>
          {zones.sort().map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}
        </select>
      </div>
      {mandatory && <Button type="button" variant="outline" onClick={() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)}>Usar fuso deste dispositivo</Button>}
      <div className="grid gap-2 font-medium"><label htmlFor="settings-locale">Formato de números e datas</label>
        <select id="settings-locale" className={selectClass} value={locale} onChange={event => setLocale(event.target.value)}>
          <option value="pt-BR">Português (Brasil) — 1.234,56</option>
          <option value="en-US">Inglês (Estados Unidos) — 1,234.56</option>
        </select>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">O fuso define o dia atual, as datas dos ajustes e os vencimentos. As datas de entradas e saídas já registradas são preservadas.</p>
      {reset && <div role="alert" className="grid gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm leading-relaxed text-red-950">
        <p>Ao trocar de {preferences.currency ?? "moeda não identificada"} para {currency}, todas as entradas, saídas, ajustes de saldo e recorrências desta carteira serão excluídos e o saldo será zerado. Os valores não serão convertidos. Esta ação não pode ser desfeita pela aplicação.</p>
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 size-4 shrink-0" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Entendi e confirmo a exclusão dos dados.</label>
      </div>}
    </fieldset>
    {message && <p role="status" className="text-sm leading-relaxed">{message}</p>}
    <Button type="submit" aria-busy={busy} disabled={busy || !currencies.includes(currency as Currency) || (reset && !confirmed)}>
      {busy && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {busy ? "Salvando…" : reset ? "Excluir dados e trocar moeda" : "Salvar configurações"}
    </Button>
    {mandatory && <Button type="button" variant="ghost" disabled={busy} onClick={() => clerk.signOut({ redirectUrl: "/auth/sign-in" })}>Sair da conta</Button>}
  </form>;
  if (!mandatory) return content;
  return <Dialog open onOpenChange={() => {}}><DialogContent showCloseButton={false} className="max-h-[calc(100svh-32px)] w-[min(520px,calc(100vw-32px))] max-w-[520px]! overflow-y-auto p-6">
    <DialogHeader><DialogTitle>Configure sua moeda para continuar</DialogTitle><DialogDescription>Escolha a moeda e confira o fuso horário. A aplicação será liberada após salvar.</DialogDescription></DialogHeader>
    {content}
  </DialogContent></Dialog>;
}
