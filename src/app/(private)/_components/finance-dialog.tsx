"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { LoaderCircle } from "lucide-react";

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
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}

function TransactionForm({
  mode,
  today,
  done,
  close,
}: {
  mode: "income" | "expense";
  today: string;
  done: () => void;
  close: () => void;
}) {
  const { setMutating } = useFinanceRefresh();
  const [requestId] = useState(() => crypto.randomUUID());
  const form = useForm<CreateTransactionInput, unknown, CreateTransactionData>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      requestId,
      type: mode,
      amount: "",
      description: "",
      category: "other",
      occurredOn: today,
    },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
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
      })}
      className="finance-form"
      noValidate
    >
      <fieldset disabled={isSubmitting}>
        <div className="finance-field">
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
        </div>
        <div className="finance-field">
          <label htmlFor="transaction-description">Descrição</label>
          <input
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
        </div>
        <div className="finance-field">
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
        </div>
        <div className="finance-field">
          <label htmlFor="transaction-date">Data da movimentação</label>
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
                disabled={isSubmitting}
                invalid={!!errors.occurredOn}
                describedBy={errors.occurredOn ? "date-error" : undefined}
              />
            )}
          />
          <FieldError id="date-error" message={errors.occurredOn?.message} />
        </div>
      </fieldset>
      {errors.root && (
        <p className="form-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="finance-form-actions">
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
          className="finance-submit"
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <LoaderCircle className="spinner" aria-hidden="true" />
          )}
          {isSubmitting
            ? "Salvando…"
            : `Salvar ${mode === "income" ? "entrada" : "saída"}`}
        </Button>
      </div>
    </form>
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
  const { setMutating, refresh } = useFinanceRefresh();
  const [requestId] = useState(() => crypto.randomUUID());
  const [conflict, setConflict] = useState(false);
  const form = useForm<AdjustBalanceInput, unknown, AdjustBalanceData>({
    resolver: zodResolver(adjustBalanceSchema),
    defaultValues: { requestId, balance, reason: "", expectedVersion: version },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
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
      })}
      className="finance-form"
      noValidate
    >
      <fieldset disabled={isSubmitting || conflict}>
        <div className="finance-field">
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
        </div>
        <div className="finance-field">
          <label htmlFor="adjustment-reason">Motivo do ajuste</label>
          <input
            id="adjustment-reason"
            placeholder="Ex.: conferência do saldo da conta"
            maxLength={240}
            aria-invalid={!!errors.reason}
            aria-describedby={errors.reason ? "reason-error" : undefined}
            {...form.register("reason")}
          />
          <FieldError id="reason-error" message={errors.reason?.message} />
        </div>
      </fieldset>
      <div className="form-note">
        <Icon name="history" />
        <p>O ajuste fica no histórico, fora dos totais de entradas e saídas.</p>
      </div>
      {errors.root && (
        <p className="form-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="finance-form-actions">
        {conflict ? (
          <Button type="button" className="finance-submit" onClick={close}>
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
              className="finance-submit"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <LoaderCircle className="spinner" aria-hidden="true" />
              )}
              {isSubmitting ? "Salvando…" : "Salvar saldo"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

export function FinanceDialog({
  mode,
  today,
  balance,
  version,
  onClose,
  onSuccess,
}: {
  mode: Mode;
  today: string;
  balance: string;
  version: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { busy } = useFinanceRefresh();
  const title =
    mode === "balance"
      ? "Ajustar saldo"
      : mode === "income"
        ? "Adicionar entrada"
        : "Adicionar saída";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="finance-modal" showCloseButton={false}>
        <DialogClose
          render={
            <Button
              size="icon"
              variant="ghost"
              className="finance-modal-close"
              aria-label="Fechar formulário"
              disabled={busy}
            />
          }
        >
          <Icon name="close" />
        </DialogClose>
        <DialogHeader className="finance-modal-heading">
          <div className={`dialog-symbol ${mode}`}>
            <Icon
              name={
                mode === "balance"
                  ? "sliders"
                  : mode === "income"
                    ? "arrowDown"
                    : "arrowUp"
              }
            />
          </div>
          <div>
            <DialogTitle className="finance-modal-title">{title}</DialogTitle>
            <DialogDescription>
              {mode === "balance"
                ? "Informe o saldo real da sua carteira."
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
