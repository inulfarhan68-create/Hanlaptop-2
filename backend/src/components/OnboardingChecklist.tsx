"use client";

import Link from "next/link";
import useSWR from "swr";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

type Step = { key: string; label: string; hint: string; href: string; done: boolean };

/**
 * First-run guidance for a shop that has just signed up.
 *
 * It disappears on its own once all three steps are done, so an established
 * tenant never sees it and nobody has to dismiss anything. While loading it
 * renders nothing rather than a skeleton — a card that flashes in and vanishes
 * on every home visit would be worse than no card.
 */
export function OnboardingChecklist() {
    const { data } = useSWR<{ steps: Step[]; complete: boolean }>("/api/onboarding/status");

    if (!data || data.complete || !data.steps?.length) return null;

    const doneCount = data.steps.filter((s) => s.done).length;
    // The first unfinished step is the only one worth pointing at; showing three
    // equally-weighted calls to action just reproduces the "where do I start"
    // problem the card exists to solve.
    const next = data.steps.find((s) => !s.done);

    return (
        // The component owns its spacing so the parent can render it bare. A
        // wrapper in the page would keep its margin even when this returns null,
        // nudging the layout for every established tenant to no purpose.
        <section
            aria-label="Langkah awal"
            className="mx-4 mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40"
        >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold text-emerald-950 dark:text-emerald-50">
                    Siapkan toko Anda
                </h2>
                <span className="text-xs text-emerald-800 dark:text-emerald-200">
                    {doneCount} dari {data.steps.length} selesai
                </span>
            </div>

            <ol className="mt-3 space-y-2">
                {data.steps.map((step) => (
                    <li key={step.key} className="flex items-start gap-2.5 text-sm">
                        {step.done ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700/40 dark:text-emerald-300/40" aria-hidden="true" />
                        )}
                        <span className="min-w-0">
                            <Link
                                href={step.href}
                                className={
                                    step.done
                                        ? "text-emerald-900/60 line-through dark:text-emerald-100/50"
                                        : "font-medium text-emerald-950 underline-offset-2 hover:underline dark:text-emerald-50"
                                }
                            >
                                {step.label}
                            </Link>
                            {!step.done && (
                                <span className="block text-xs text-emerald-800/80 dark:text-emerald-200/70">
                                    {step.hint}
                                </span>
                            )}
                        </span>
                    </li>
                ))}
            </ol>

            {next && (
                <Link
                    href={next.href}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:hover:bg-emerald-500"
                >
                    {next.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            )}
        </section>
    );
}
