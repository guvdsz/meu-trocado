"use client";

import {
    usePreferences,
    useFinancialFormat,
} from "@/app/(private)/_components/preferences-context";

import {
    FormLayout,
    FormField,
    FormActions,
} from "@/app/_components/ui/form-layout";

import { PageHeading } from "@/app/(private)/_components/finance-layout";

import { Input } from "@/app/_components/ui/input";

import { useState } from "react";
import {
    Plus,
    Repeat,
    Pencil,
    Square,
    CalendarDays,
    LoaderCircle,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    updateRecurrenceSchema,
    type UpdateRecurrenceData,
    type UpdateRecurrenceInput,
} from "@schemas/recurrence/manage";
import {
    categoryLabels,
    transactionCategories,
} from "@schemas/transaction/category";
import { recurrenceLabels } from "@schemas/recurrence/frequency";
import { type RecurringExpense } from "@/lib/recurrence";
import { Button } from "@/app/_components/ui/button";
import { MoneyInput } from "@/app/_components/ui/money-input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/app/_components/ui/dialog";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/app/_components/ui/select";
import { toast } from "@/app/_components/ui/toast";
import { FinanceDialog } from "../../_components/finance-dialog";
import { useFinanceRefresh } from "../../_components/refresh-context";
import {
    endRecurrenceAction,
    updateRecurrenceAction,
} from "../_actions/manage-recurrence";
import { RecurrencesSkeleton } from "./recurrences-skeleton";

function ManageDialog({
    recurrence,
    end,
    close,
}: {
    recurrence: RecurringExpense;
    end: boolean;
    close: () => void;
}) {
    const { formatMoney, formatDay } = useFinancialFormat();
    const preferences = usePreferences();
    const { setMutating, refresh } = useFinanceRefresh();
    const [conflict, setConflict] = useState(false);
    const form = useForm<UpdateRecurrenceInput, unknown, UpdateRecurrenceData>({
        resolver: zodResolver(updateRecurrenceSchema),
        defaultValues: {
            id: recurrence.id,
            expectedVersion: recurrence.version,
            expectedSettingsVersion: preferences.settingsVersion,
            description: recurrence.description,
            amount: recurrence.amount,
            category: recurrence.category,
        },
    });
    const { errors, isSubmitting } = form.formState;
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open && !isSubmitting) close();
            }}
        >
            <DialogContent
                className="finance-modal max-h-[calc(100svh-32px)] w-[min(480px,calc(100vw-32px))] max-w-[min(480px,calc(100vw-32px))]! gap-6 overflow-y-auto bg-[#fbfcf8] p-6 max-[400px]:gap-[22px] max-[400px]:px-[18px] max-[400px]:py-[22px]"
                showCloseButton={!isSubmitting}
            >
                <DialogHeader className="finance-modal-heading grid grid-cols-[48px_minmax(0,1fr)] items-stretch gap-3 pr-7 [&_.dialog-symbol]:m-0 [&_.dialog-symbol]:h-auto [&_.dialog-symbol]:min-h-12 [&_.dialog-symbol]:w-12 [&_[data-slot=dialog-description]]:mt-1.5 [&_[data-slot=dialog-description]]:text-sm [&_[data-slot=dialog-description]]:leading-normal [&_[data-slot=dialog-description]]:text-[#526548] max-[400px]:gap-2.5 max-[400px]:pr-6">
                    <div className="dialog-symbol mb-[5px] grid size-11 place-items-center rounded-xl bg-[#e9f0df] text-[#547737] [&.expense]:bg-[#faeee5] [&.expense]:text-[#a35b38] expense">
                        <Repeat aria-hidden="true" />
                    </div>
                    <div>
                        <DialogTitle className="finance-modal-title m-0 text-[23px] leading-[1.3] font-semibold tracking-[-0.7px] max-[400px]:text-[21px]">
                            {end
                                ? "Encerrar recorrência?"
                                : "Editar recorrência"}
                        </DialogTitle>
                        <DialogDescription>
                            {end
                                ? "Os lançamentos anteriores ficam no histórico."
                                : "As alterações valem para os próximos lançamentos."}
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <FormLayout
                    noValidate
                    onSubmit={form.handleSubmit(async (values) => {
                        setMutating(true);
                        form.clearErrors();
                        try {
                            const result = await (end
                                ? endRecurrenceAction(values)
                                : updateRecurrenceAction(values));
                            if (result.success) {
                                toast.add({
                                    title: end
                                        ? "Recorrência encerrada"
                                        : "Recorrência atualizada",
                                    type: "success",
                                });
                                close();
                                refresh();
                            } else {
                                form.setError("root", {
                                    message: result.message,
                                });
                                if (result.code === "conflict") {
                                    setConflict(true);
                                    refresh();
                                }
                            }
                        } catch {
                            form.setError("root", {
                                message:
                                    "Confira sua conexão e tente novamente.",
                            });
                        } finally {
                            setMutating(false);
                        }
                    })}
                >
                    {end ? (
                        <p>
                            Encerrar <strong>{recurrence.description}</strong>,
                            de {formatMoney(recurrence.amount)}? Nenhuma saída
                            futura será gerada. Vencimentos até hoje continuam
                            sendo lançados.
                        </p>
                    ) : (
                        <fieldset disabled={isSubmitting || conflict}>
                            <FormField>
                                <label htmlFor="recurrence-amount">Valor</label>
                                <Controller
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <MoneyInput
                                            {...field}
                                            id="recurrence-amount"
                                            onValueChange={field.onChange}
                                            aria-invalid={!!errors.amount}
                                            aria-describedby={
                                                errors.amount
                                                    ? "recurrence-amount-error"
                                                    : undefined
                                            }
                                        />
                                    )}
                                />
                                {errors.amount && (
                                    <p
                                        className="field-error m-0 min-h-0 text-[13px] leading-normal text-[#a13e2e]"
                                        role="alert"
                                        id="recurrence-amount-error"
                                    >
                                        {errors.amount.message}
                                    </p>
                                )}
                            </FormField>
                            <FormField>
                                <label htmlFor="recurrence-description">
                                    Descrição
                                </label>
                                <Input
                                    id="recurrence-description"
                                    maxLength={160}
                                    {...form.register("description")}
                                    aria-invalid={!!errors.description}
                                    aria-describedby={
                                        errors.description
                                            ? "recurrence-description-error"
                                            : undefined
                                    }
                                />
                                {errors.description && (
                                    <p
                                        className="field-error m-0 min-h-0 text-[13px] leading-normal text-[#a13e2e]"
                                        role="alert"
                                        id="recurrence-description-error"
                                    >
                                        {errors.description.message}
                                    </p>
                                )}
                            </FormField>
                            <FormField>
                                <label htmlFor="recurrence-category">
                                    Categoria
                                </label>
                                <Controller
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            items={transactionCategories.map(
                                                (value) => ({
                                                    value,
                                                    label: categoryLabels[
                                                        value
                                                    ],
                                                }),
                                            )}
                                        >
                                            <SelectTrigger
                                                id="recurrence-category"
                                                ref={field.ref}
                                                onBlur={field.onBlur}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent
                                                alignItemWithTrigger={false}
                                            >
                                                {transactionCategories.map(
                                                    (value) => (
                                                        <SelectItem
                                                            key={value}
                                                            value={value}
                                                        >
                                                            {
                                                                categoryLabels[
                                                                    value
                                                                ]
                                                            }
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </FormField>
                            <p>
                                {recurrenceLabels[recurrence.frequency]} ·
                                Próximo: {formatDay(recurrence.nextDueOn)}
                            </p>
                        </fieldset>
                    )}
                    {errors.root && (
                        <p
                            className="form-error m-0 rounded-lg border border-[#e4c6b5] bg-[#fcf1eb] p-3 text-sm leading-[1.6] text-[#963e2d]"
                            role="alert"
                        >
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
                            {conflict ? "Fechar e conferir" : "Cancelar"}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || conflict}
                        >
                            {isSubmitting && (
                                <LoaderCircle
                                    className="spinner animate-spin motion-reduce:animate-none"
                                    aria-hidden="true"
                                />
                            )}
                            {isSubmitting
                                ? "Salvando…"
                                : end
                                  ? "Encerrar"
                                  : "Salvar alterações"}
                        </Button>
                    </FormActions>
                </FormLayout>
            </DialogContent>
        </Dialog>
    );
}

export function RecurrencesScreen({
    recurrences,
    account,
    today,
}: {
    recurrences: RecurringExpense[];
    account: { balance: string; version: number };
    today: string;
}) {
    const { formatMoney, formatDay } = useFinancialFormat();
    const { busy, refresh } = useFinanceRefresh();
    const [creating, setCreating] = useState(false);
    const [selected, setSelected] = useState<{
        recurrence: RecurringExpense;
        end: boolean;
    } | null>(null);
    return (
        <div className="finance-page">
            <PageHeading>
                <div>
                    <h1>Recorrências</h1>
                    <p>Saídas automáticas e próximos lançamentos</p>
                </div>
                <Button onClick={() => setCreating(true)} disabled={busy}>
                    <Plus aria-hidden="true" />
                    Adicionar recorrência
                </Button>
            </PageHeading>
            <div aria-busy={busy}>
                {busy ? (
                    <RecurrencesSkeleton />
                ) : !recurrences.length ? (
                    <section className="finance-panel overflow-hidden rounded-2xl border bg-white finance-empty flex min-h-[180px] flex-col items-center justify-center gap-3 px-6 py-11 text-center [&_h2]:m-0 [&_h2]:text-lg [&_h2]:font-[550] [&_h3]:m-0 [&_h3]:text-lg [&_h3]:font-[550] [&_h1]:m-0 [&_h1]:text-[26px] [&_h1]:font-semibold [&_p]:m-0 [&_p]:max-w-[500px] [&_p]:text-[15px] [&_p]:text-[#53634a] [&>svg]:mb-[3px] [&>svg]:text-[#78985e]">
                        <Repeat size={28} aria-hidden="true" />
                        <h2>Nenhuma recorrência ativa</h2>
                        <p>
                            Repita uma saída mensal, anual, semestral ou a cada
                            15 dias.
                        </p>
                    </section>
                ) : (
                    <ul
                        className="m-0 grid list-none gap-4 p-0"
                        aria-label="Saídas recorrentes ativas"
                    >
                        {recurrences.map((recurrence) => (
                            <li
                                className="finance-panel overflow-hidden rounded-2xl border bg-white p-6 max-[600px]:p-5"
                                key={recurrence.id}
                            >
                                <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 [&_h2]:mt-0 [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:leading-[1.4] [&_h2]:wrap-anywhere [&_p]:m-0 [&_p]:text-sm [&_p]:leading-[1.6] [&_p]:text-muted-foreground max-[600px]:grid-cols-[48px_minmax(0,1fr)] max-[600px]:gap-3">
                                    <span className="grid size-12 place-items-center rounded-xl bg-muted [&_svg]:size-[22px]">
                                        <Repeat aria-hidden="true" />
                                    </span>
                                    <div>
                                        <h2>{recurrence.description}</h2>
                                        <p>
                                            {
                                                categoryLabels[
                                                    recurrence.category
                                                ]
                                            }{" "}
                                            ·{" "}
                                            {
                                                recurrenceLabels[
                                                    recurrence.frequency
                                                ]
                                            }
                                        </p>
                                    </div>
                                    <strong className="text-xl whitespace-nowrap tabular-nums max-[600px]:col-start-2 max-[600px]:text-lg max-[600px]:whitespace-normal max-[600px]:wrap-anywhere">
                                        {formatMoney(recurrence.amount)}
                                    </strong>
                                </div>
                                <div className="mt-5 flex items-center justify-between gap-4 border-t pt-4 [&_p]:m-0 [&_p]:flex [&_p]:flex-wrap [&_p]:items-center [&_p]:gap-1.5 [&_p]:text-sm [&_p]:leading-[1.6] [&_p]:text-muted-foreground max-[600px]:flex-col max-[600px]:items-stretch">
                                    <p>
                                        <CalendarDays
                                            size={18}
                                            aria-hidden="true"
                                        />
                                        Próximo:{" "}
                                        <time dateTime={recurrence.nextDueOn}>
                                            {formatDay(recurrence.nextDueOn)}
                                        </time>
                                    </p>
                                    <div className="flex gap-2 max-[600px]:[&>button]:flex-1">
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setSelected({
                                                    recurrence,
                                                    end: false,
                                                })
                                            }
                                            aria-label={`Editar ${recurrence.description}`}
                                        >
                                            <Pencil aria-hidden="true" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setSelected({
                                                    recurrence,
                                                    end: true,
                                                })
                                            }
                                            aria-label={`Encerrar ${recurrence.description}`}
                                        >
                                            <Square aria-hidden="true" />
                                            Encerrar
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {creating && (
                <FinanceDialog
                    mode="expense"
                    defaultRepeat="monthly"
                    today={today}
                    balance={account.balance}
                    version={account.version}
                    onClose={() => setCreating(false)}
                    onSuccess={() => {
                        setCreating(false);
                        toast.add({ title: "Saída salva", type: "success" });
                        refresh();
                    }}
                />
            )}
            {selected && (
                <ManageDialog {...selected} close={() => setSelected(null)} />
            )}
        </div>
    );
}
