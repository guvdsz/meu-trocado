"use client";

import { usePreferences } from "./preferences-context";

import { FormLayout, FormField, FormActions } from "@/app/_components/ui/form-layout";

import { Input } from "@/app/_components/ui/input";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTransactionSchema,
  type CreateTransactionInput,
  type CreateTransactionData,
} from "@schemas/transaction/create-transaction";
import {
  adjustBalanceSchema,
  type AdjustBalanceInput,
  type AdjustBalanceData,
} from "@schemas/account/adjust-balance";
import { createTransactionAction } from "../transactions/_actions/create-transaction";
import { adjustBalanceAction } from "../_actions/adjust-balance";
import { Icon } from "@/app/_components/shared/icon";
import type { ActionResult } from "@/lib/action-result";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { DatePicker } from "@/app/_components/ui/date-picker";
import { MoneyInput } from "@/app/_components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  categoryLabels,
  transactionCategories,
} from "@schemas/transaction/category";
import { useFinanceRefresh } from "./refresh-context";
import { LoaderCircle, Repeat } from "lucide-react";
import {
  recurrenceFrequencies,
  recurrenceLabels,
  type RecurrenceFrequency,
} from "@schemas/recurrence/frequency";

type Mode = "income" | "expense" | "balance";

async function submitSafely(
  action: () => Promise<ActionResult>,
): Promise<ActionResult> {
  try {
    return await action();
  } catch {
    return {
      success: false,
      message: "A conexão falhou. Confira sua internet e tente novamente.",
    };
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="field-error m-0 min-h-0 text-[13px] leading-normal text-[#a13e2e]" role="alert">
      {message}
    </p>
  ) : null;
}

function TransactionForm({
  mode,
  defaultRepeat = "none",
  today,
  done,
  close,
}: {
  mode: "income" | "expense";
  defaultRepeat?: "none" | RecurrenceFrequency;
  today: string;
  done: () => void;
  close: () => void;
}) {
  const preferences = usePreferences();
  const { setMutating, runMutation } = useFinanceRefresh();
  const [requestId] = useState(() => crypto.randomUUID());
  const form = useForm<CreateTransactionInput, unknown, CreateTransactionData>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      requestId,
      expectedSettingsVersion: preferences.settingsVersion,
      type: mode,
      amount: "",
      description: "",
      category: "other",
      occurredOn: today,
      repeat: mode === "expense" ? defaultRepeat : "none",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const repeating = useWatch({ control: form.control, name: "repeat" }) !== "none";
  return (
    <FormLayout
      onSubmit={form.handleSubmit((values) => runMutation(async () => {
        form.clearErrors();
        setMutating(true);
        const result = await submitSafely(() =>
          createTransactionAction(values),
        );
        setMutating(false);
        if (result.success) return done();
        form.setError("root", { message: result.message });
        for (const [key, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          if (messages?.[0])
            form.setError(key as keyof CreateTransactionInput, {
              message: messages[0],
            });
        }
      }))}

      noValidate
    >
      <fieldset disabled={isSubmitting}>
        <FormField>
          <label htmlFor="transaction-amount">Qual é o valor?</label>
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <MoneyInput
                {...field}
                onValueChange={field.onChange}
                id="transaction-amount"
                autoFocus
                placeholder="0,00"
                disabled={isSubmitting}
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? "amount-error" : undefined}
              />
            )}
          />
          <FieldError id="amount-error" message={errors.amount?.message} />
        </FormField>
        <FormField>
          <label htmlFor="transaction-description">Descrição</label>
          <Input
            id="transaction-description"
            placeholder={mode === "income" ? "Ex.: salário" : "Ex.: mercado"}
            maxLength={160}
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
            {...form.register("description")}
          />
          <FieldError
            id="description-error"
            message={errors.description?.message}
          />
        </FormField>
        <FormField>
          <label htmlFor="transaction-category">Categoria</label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={transactionCategories.map((value) => ({
                  value,
                  label: categoryLabels[value],
                }))}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="transaction-category"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={!!errors.category}
                  aria-describedby={
                    errors.category ? "category-error" : undefined
                  }
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {transactionCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {categoryLabels[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id="category-error" message={errors.category?.message} />
        </FormField>
        {mode === "expense" && (
          <FormField>
            <label htmlFor="transaction-repeat">Repetição</label>
            <Controller
              control={form.control}
              name="repeat"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    const date = form.getValues("occurredOn");
                    if (
                      (value === "none" && date > today) ||
                      (value !== "none" && date < today)
                    )
                      form.setValue("occurredOn", today);
                  }}
                  disabled={isSubmitting}
                  items={[
                    { value: "none", label: "Não repetir" },
                    ...recurrenceFrequencies.map((value) => ({
                      value,
                      label: recurrenceLabels[value],
                    })),
                  ]}
                >
                  <SelectTrigger
                    id="transaction-repeat"
                    ref={field.ref}
                    onBlur={field.onBlur}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="none">Não repetir</SelectItem>
                    {recurrenceFrequencies.map((value) => (
                      <SelectItem key={value} value={value}>
                        {recurrenceLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError id="repeat-error" message={errors.repeat?.message} />
          </FormField>
        )}
        <FormField>
          <label htmlFor="transaction-date">
            {repeating ? "Primeiro lançamento" : "Data da movimentação"}
          </label>
          <Controller
            control={form.control}
            name="occurredOn"
            render={({ field }) => (
              <DatePicker
                id="transaction-date"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                triggerRef={field.ref}
                today={today}
                future={repeating}
                disabled={isSubmitting}
                invalid={!!errors.occurredOn}
                describedBy={errors.occurredOn ? "date-error" : undefined}
              />
            )}
          />
          <FieldError id="date-error" message={errors.occurredOn?.message} />
        </FormField>
      </fieldset>
      {repeating && (
        <div className="form-note m-0 flex items-start gap-2.5 rounded-lg bg-[#eef3e6] p-3 text-[#536c43] [&_svg]:w-5 [&_svg]:shrink-0 [&_p]:m-0 [&_p]:text-sm [&_p]:leading-normal">
          <Icon name="history" />
          <p>Saída automática até você encerrar em Recorrências.</p>
        </div>
      )}
      {errors.root && (
        <p className="form-error m-0 rounded-lg border border-[#e4c6b5] bg-[#fcf1eb] p-3 text-sm leading-[1.6] text-[#963e2d]" role="alert">
          {errors.root.message}
        </p>
      )}
      <FormActions>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={close}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="finance-submit [&_svg]:size-4"
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <LoaderCircle className="spinner animate-spin motion-reduce:animate-none" aria-hidden="true" />
          )}
          {isSubmitting
            ? "Salvando…"
            : `Salvar ${mode === "income" ? "entrada" : "saída"}`}
        </Button>
      </FormActions>
    </FormLayout>
  );
}

function BalanceForm({
  balance,
  version,
  done,
  close,
}: {
  balance: string;
  version: number;
  done: () => void;
  close: () => void;
}) {
  const preferences = usePreferences();
  const { setMutating, refresh, runMutation } = useFinanceRefresh();
  const [requestId] = useState(() => crypto.randomUUID());
  const [conflict, setConflict] = useState(false);
  const form = useForm<AdjustBalanceInput, unknown, AdjustBalanceData>({
    resolver: zodResolver(adjustBalanceSchema),
    defaultValues: { requestId, balance, reason: "", expectedVersion: version, expectedSettingsVersion: preferences.settingsVersion },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <FormLayout
      onSubmit={form.handleSubmit((values) => runMutation(async () => {
        form.clearErrors();
        setMutating(true);
        const result = await submitSafely(() => adjustBalanceAction(values));
        setMutating(false);
        if (result.success) return done();
        form.setError("root", { message: result.message });
        if (result.code === "conflict") {
          setConflict(true);
          refresh();
        }
        for (const [key, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          if (messages?.[0])
            form.setError(key as keyof AdjustBalanceInput, {
              message: messages[0],
            });
        }
      }))}

      noValidate
    >
      <fieldset disabled={isSubmitting || conflict}>
        <FormField>
          <label htmlFor="new-balance">Qual é seu saldo real agora?</label>
          <Controller
            control={form.control}
            name="balance"
            render={({ field }) => (
              <MoneyInput
                {...field}
                onValueChange={field.onChange}
                id="new-balance"
                autoFocus
                allowNegative
                disabled={isSubmitting || conflict}
                aria-invalid={!!errors.balance}
                aria-describedby={errors.balance ? "balance-error" : undefined}
              />
            )}
          />
          <FieldError id="balance-error" message={errors.balance?.message} />
        </FormField>
        <FormField>
          <label htmlFor="adjustment-reason">Motivo do ajuste</label>
          <Input
            id="adjustment-reason"
            placeholder="Ex.: conferência do saldo da conta"
            maxLength={240}
            aria-invalid={!!errors.reason}
            aria-describedby={errors.reason ? "reason-error" : undefined}
            {...form.register("reason")}
          />
          <FieldError id="reason-error" message={errors.reason?.message} />
        </FormField>
      </fieldset>
      <div className="form-note m-0 flex items-start gap-2.5 rounded-lg bg-[#eef3e6] p-3 text-[#536c43] [&_svg]:w-5 [&_svg]:shrink-0 [&_p]:m-0 [&_p]:text-sm [&_p]:leading-normal">
        <Icon name="history" />
        <p title="O ajuste fica no histórico, fora dos totais de entradas e saídas.">
          Não altera entradas e saídas.
        </p>
      </div>
      {errors.root && (
        <p className="form-error m-0 rounded-lg border border-[#e4c6b5] bg-[#fcf1eb] p-3 text-sm leading-[1.6] text-[#963e2d]" role="alert">
          {errors.root.message}
        </p>
      )}
      <FormActions>
        {conflict ? (
          <Button type="button" className="finance-submit [&_svg]:size-4" onClick={close}>
            Conferir saldo
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={close}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="finance-submit [&_svg]:size-4"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <LoaderCircle className="spinner animate-spin motion-reduce:animate-none" aria-hidden="true" />
              )}
              {isSubmitting ? "Salvando…" : "Salvar saldo"}
            </Button>
          </>
        )}
      </FormActions>
    </FormLayout>
  );
}

export function FinanceDialog({
  mode,
  defaultRepeat,
  today,
  balance,
  version,
  onClose,
  onSuccess,
}: {
  mode: Mode;
  defaultRepeat?: "none" | RecurrenceFrequency;
  today: string;
  balance: string;
  version: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { busy } = useFinanceRefresh();
  const isRecurrence =
    mode === "expense" && !!defaultRepeat && defaultRepeat !== "none";
  const title =
    mode === "balance"
      ? "Ajustar saldo"
      : mode === "income"
        ? "Adicionar entrada"
        : isRecurrence
          ? "Adicionar recorrência"
          : "Adicionar saída";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="finance-modal max-h-[calc(100svh-32px)] w-[min(480px,calc(100vw-32px))] max-w-[min(480px,calc(100vw-32px))]! gap-6 overflow-y-auto bg-[#fbfcf8] p-6 max-[400px]:gap-[22px] max-[400px]:px-[18px] max-[400px]:py-[22px]" showCloseButton={false}>
        <DialogClose
          render={
            <Button
              size="icon"
              variant="ghost"
              className="finance-modal-close absolute top-2.5 right-2.5"
              aria-label="Fechar formulário"
              disabled={busy}
            />
          }
        >
          <Icon name="close" />
        </DialogClose>
        <DialogHeader className="finance-modal-heading grid grid-cols-[48px_minmax(0,1fr)] items-stretch gap-3 pr-7 [&_.dialog-symbol]:m-0 [&_.dialog-symbol]:h-auto [&_.dialog-symbol]:min-h-12 [&_.dialog-symbol]:w-12 [&_[data-slot=dialog-description]]:mt-1.5 [&_[data-slot=dialog-description]]:text-sm [&_[data-slot=dialog-description]]:leading-normal [&_[data-slot=dialog-description]]:text-[#526548] max-[400px]:gap-2.5 max-[400px]:pr-6">
          <div className={`dialog-symbol mb-[5px] grid size-11 place-items-center rounded-xl bg-[#e9f0df] text-[#547737] [&.expense]:bg-[#faeee5] [&.expense]:text-[#a35b38] ${isRecurrence ? "recurrence" : mode}`}>
            {isRecurrence ? (
              <Repeat size={20} aria-hidden="true" />
            ) : (
              <Icon
                name={
                  mode === "balance"
                    ? "sliders"
                    : mode === "income"
                      ? "arrowDown"
                      : "arrowUp"
                }
              />
            )}
          </div>
          <div>
            <DialogTitle className="finance-modal-title m-0 text-[23px] leading-[1.3] font-semibold tracking-[-0.7px] max-[400px]:text-[21px]">{title}</DialogTitle>
            <DialogDescription>
              {mode === "balance"
                ? "Informe o saldo real da sua carteira."
                : isRecurrence
                  ? "Defina o valor, a frequência e o primeiro lançamento."
                  : "Informe o valor e os detalhes da movimentação."}
            </DialogDescription>
          </div>
        </DialogHeader>
        {mode === "balance" ? (
          <BalanceForm
            close={onClose}
            balance={balance}
            version={version}
            done={onSuccess}
          />
        ) : (
          <TransactionForm
            defaultRepeat={defaultRepeat}
            close={onClose}
            mode={mode}
            today={today}
            done={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
