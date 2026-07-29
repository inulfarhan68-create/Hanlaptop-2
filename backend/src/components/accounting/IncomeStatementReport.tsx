"use client";

import { Card } from "@/components/ui/card"
import { ChevronRight, ChevronDown, Search, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { useState, useMemo } from "react"
import { DrillDownModal } from "./DrillDownModal"

interface IncomeStatementReportProps {
    data: any
    comparison?: any
    fmt: (v: number) => string
    isLoading: boolean
}

/**
 * Composition palette — validated (dataviz six-checks) against both the light card
 * (#ffffff) and the dark card (hsl(220 15% 11%)). Slots 1-3 of the categorical order;
 * the green sits below 3:1 on white, so the bar always ships direct labels beneath it.
 */
const SEG = {
    cogs: "bg-[#2a78d6] dark:bg-[#3987e5]",
    opex: "bg-[#eb6834] dark:bg-[#d95926]",
    profit: "bg-[#1baf7a] dark:bg-[#199e70]",
}

/** Accounting convention: negatives are shown in parentheses, never with a minus sign. */
const paren = (v: number, fmt: (n: number) => string) =>
    v < 0 ? `(${fmt(Math.abs(v))})` : fmt(v)

/**
 * Month-over-month delta. Arrow + value carry the meaning; colour is a reinforcement,
 * never the only channel.
 */
function Delta({ current, prev }: { current: number; prev: number | undefined | null }) {
    if (prev === undefined || prev === null) return null
    const diff = current - prev
    const base = Math.max(Math.abs(prev), Math.abs(current), 1)
    if (Math.abs(diff) < base * 0.001) {
        return <span className="ml-2 text-[10px] font-medium text-muted-foreground tabular-nums" title="Sama dengan bulan lalu">— 0%</span>
    }
    const up = diff > 0
    const pct = prev !== 0 ? (Math.abs(diff) / Math.abs(prev)) * 100 : 100
    return (
        <span
            className={`ml-2 text-[10px] font-medium tabular-nums ${up ? "text-[#006300] dark:text-[#0ca30c]" : "text-[#d03b3b]"}`}
            title="Dibanding bulan lalu"
        >
            {up ? "▲" : "▼"} {pct >= 1000 ? ">999" : pct.toFixed(0)}%
        </span>
    )
}

/** A collapsible account group: header line + indented account rows. */
function Section({
    title,
    accounts,
    total,
    fmt,
    defaultOpen = false,
    isNegative = false,
    onAccountClick,
}: {
    title: string
    accounts: any[]
    total: number
    fmt: (v: number) => string
    defaultOpen?: boolean
    isNegative?: boolean
    onAccountClick?: (account: any) => void
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const signed = isNegative ? -Math.abs(total) : total

    return (
        <div className="border-t border-border/60 first:border-t-0">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-baseline justify-between gap-4 px-4 md:px-6 py-2.5 text-left hover:bg-muted/40 transition-colors"
            >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    {isOpen
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    {title}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-foreground shrink-0">
                    {paren(signed, fmt)}
                </span>
            </button>

            {isOpen && accounts.length > 0 && (
                <div className="pb-1">
                    {accounts.map((account: any) => (
                        <div
                            key={account.code}
                            onClick={() => onAccountClick?.(account)}
                            className={`group flex items-baseline justify-between gap-4 pl-11 pr-4 md:pr-6 py-1.5 text-[13px] hover:bg-muted/40 transition-colors ${onAccountClick ? "cursor-pointer" : ""}`}
                        >
                            <span className="text-muted-foreground inline-flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{account.name}</span>
                                {onAccountClick && (
                                    <Search className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
                                )}
                            </span>
                            <span className="tabular-nums text-foreground/80 shrink-0">
                                {paren(isNegative ? -Math.abs(account.amount) : account.amount, fmt)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

/** Subtotal line: a single rule above, per accounting convention. */
function Subtotal({
    label,
    value,
    fmt,
    comparison,
    emphasis = false,
}: {
    label: string
    value: number
    fmt: (v: number) => string
    comparison?: number | null
    emphasis?: boolean
}) {
    return (
        <div className={`flex items-baseline justify-between gap-4 px-4 md:px-6 border-t border-foreground/20 ${emphasis ? "py-3 bg-muted/40" : "py-2.5"}`}>
            <span className={`text-[11px] uppercase tracking-wide ${emphasis ? "font-bold text-foreground" : "font-semibold text-foreground/90"}`}>
                {label}
            </span>
            <span className={`tabular-nums shrink-0 ${emphasis ? "text-[15px] font-bold" : "text-[13px] font-semibold"} text-foreground`}>
                {paren(value, fmt)}
                <Delta current={value} prev={comparison} />
            </span>
        </div>
    )
}

export function IncomeStatementReport({ data, comparison, fmt, isLoading }: IncomeStatementReportProps) {
    const [drill, setDrill] = useState<{ code: string; name: string } | null>(null)
    const handleDrill = (account: any) => setDrill({ code: account.code, name: account.name })

    // Opex breakdown — computed before any early return so the hook order stays stable
    // across loading/loaded renders (React requires hooks to run unconditionally).
    const opexBars = useMemo(() => {
        const opexSecs = ((data?.sections ?? []) as any[]).filter(
            (s: any) => s.name.startsWith("Beban") && s.name !== "Beban Pajak"
        )
        const flat = opexSecs.flatMap((s: any) => s.accounts)
        const sorted = [...flat].sort((a: any, b: any) => b.amount - a.amount)
        const top = sorted.slice(0, 5)
        const rest = sorted.slice(5)
        const rows = top.map((acc: any) => ({ name: acc.name.replace("Beban ", ""), value: acc.amount }))
        if (rest.length > 0) {
            rows.push({ name: "Lainnya", value: rest.reduce((s: number, a: any) => s + a.amount, 0) })
        }
        return rows.filter((r) => r.value > 0)
    }, [data])

    if (isLoading) {
        return (
            <Card className="border-border shadow-none">
                <div className="px-6 py-5 border-b border-border">
                    <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                </div>
                <div className="p-6 space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-4 w-full rounded bg-muted/60 animate-pulse" />
                    ))}
                </div>
            </Card>
        )
    }

    if (!data) {
        return (
            <Card className="border-border shadow-none">
                <div className="py-16 text-center text-sm text-muted-foreground">Gagal memuat data</div>
            </Card>
        )
    }

    const {
        sections = [],
        grossProfit = 0,
        operatingIncome = 0,
        netIncome = 0,
        revenue = 0,
        cogs = 0,
        opex = 0,
        incomeBeforeTax = 0,
        tax = 0,
        period,
    } = data

    const revenueSection = sections.find((s: any) => s.name === "PENDAPATAN")
    const cogsSection = sections.find((s: any) => s.name === "HARGA POKOK PENJUALAN")
    const opexSections = sections.filter((s: any) => s.name.startsWith("Beban") && s.name !== "Beban Pajak")
    const otherSection = sections.find((s: any) => s.name === "PENDAPATAN DAN BEBAN LAINNYA")

    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
    const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0
    const opexRatio = revenue > 0 ? (opex / revenue) * 100 : 0
    const cogsRatio = revenue > 0 ? (cogs / revenue) * 100 : 0

    const totalRev = revenue > 0 ? revenue : 1
    const cogsPct = Math.min((cogs / totalRev) * 100, 100)
    const opexPct = Math.min((opex / totalRev) * 100, 100)
    const profitPct = netIncome > 0 ? (netIncome / totalRev) * 100 : 0

    const opexMax = opexBars.length > 0 ? Math.max(...opexBars.map((b) => b.value)) : 0

    const periodLabel = period
        ? new Date(period.year, period.month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })
        : "—"

    // Notes — status colour always ships with an icon + label, never colour alone.
    const notes: { icon: React.ReactNode; text: string }[] = []
    if (netIncome < 0) {
        notes.push({
            icon: <XCircle className="h-3.5 w-3.5 text-[#d03b3b] shrink-0" />,
            text: "Periode ini mengalami defisit. Tinjau strategi penjualan dan pengeluaran.",
        })
    } else if (netMargin > 0 && netMargin < 5) {
        notes.push({
            icon: <AlertTriangle className="h-3.5 w-3.5 text-[#ec835a] shrink-0" />,
            text: "Margin bersih di bawah 5%. Tinjau HPP atau pangkas beban operasional.",
        })
    } else if (netMargin > 15) {
        notes.push({
            icon: <CheckCircle2 className="h-3.5 w-3.5 text-[#0ca30c] shrink-0" />,
            text: "Margin bersih di atas 15% — profitabilitas sehat.",
        })
    }
    if (opexRatio > 35) {
        notes.push({
            icon: <AlertTriangle className="h-3.5 w-3.5 text-[#ec835a] shrink-0" />,
            text: `Beban operasional menyerap ${opexRatio.toFixed(0)}% omzet.`,
        })
    }

    const ratios = [
        { label: "Margin Kotor", value: grossMargin },
        { label: "Margin Bersih", value: netMargin },
        { label: "Rasio Beban", value: opexRatio },
        { label: "Rasio HPP", value: cogsRatio },
    ]

    return (
        <>
            <Card className="border-border shadow-none overflow-hidden">
                {/* Document header */}
                <header className="px-4 md:px-6 py-5 border-b border-border">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold tracking-tight text-foreground">Laporan Laba Rugi</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Periode {periodLabel} · dalam Rupiah
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                            {netIncome >= 0
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-[#0ca30c]" />
                                : <XCircle className="h-3.5 w-3.5 text-[#d03b3b]" />}
                            {netIncome >= 0 ? "Laba" : "Rugi"}
                        </span>
                    </div>
                </header>

                {/* Ratio strip — the numbers are the chart; proportional figures, no tabular-nums. */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border border-b border-border">
                    {ratios.map((r) => (
                        <div key={r.label} className="px-4 md:px-6 py-4">
                            <div className="text-[11px] text-muted-foreground">{r.label}</div>
                            <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                                {r.value.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">%</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Composition + opex breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8 px-4 md:px-6 py-6 border-b border-border">
                    <section>
                        <div className="flex items-baseline justify-between gap-4">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Distribusi Omzet
                            </h3>
                            <span className="text-[13px] font-semibold tabular-nums text-foreground">
                                {fmt(revenue)}
                                <Delta current={revenue} prev={comparison?.revenue} />
                            </span>
                        </div>

                        {/* 2px surface gaps between segments — no borders around marks. */}
                        <div className="mt-3 flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-muted">
                            {cogsPct > 0 && <div className={`h-full ${SEG.cogs}`} style={{ width: `${cogsPct}%` }} />}
                            {opexPct > 0 && <div className={`h-full ${SEG.opex}`} style={{ width: `${opexPct}%` }} />}
                            {profitPct > 0 && <div className={`h-full ${SEG.profit}`} style={{ width: `${profitPct}%` }} />}
                        </div>

                        {/* Direct labels — required relief for the sub-3:1 green on the light surface. */}
                        <dl className="mt-3 space-y-1.5">
                            {[
                                { cls: SEG.cogs, label: "Harga Pokok Penjualan", pct: cogsPct, val: cogs },
                                { cls: SEG.opex, label: "Beban Operasional", pct: opexPct, val: opex },
                                { cls: SEG.profit, label: "Laba Bersih", pct: profitPct, val: netIncome },
                            ].map((s) => (
                                <div key={s.label} className="flex items-baseline justify-between gap-3 text-xs">
                                    <dt className="flex items-center gap-2 text-muted-foreground min-w-0">
                                        <span className={`h-2 w-2 rounded-full shrink-0 ${s.cls}`} />
                                        <span className="truncate">{s.label}</span>
                                    </dt>
                                    <dd className="shrink-0 tabular-nums text-foreground/80">
                                        {s.pct.toFixed(1)}% · {fmt(Math.abs(s.val))}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    {opexBars.length > 0 && (
                        <section>
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Rincian Beban Operasional
                            </h3>
                            {/* One series → one hue for every bar; sorted, direct-labelled. */}
                            <ul className="mt-3 space-y-2.5">
                                {opexBars.map((b) => (
                                    <li key={b.name}>
                                        <div className="flex items-baseline justify-between gap-3 text-xs">
                                            <span className="truncate text-muted-foreground">{b.name}</span>
                                            <span className="shrink-0 tabular-nums text-foreground/80">{fmt(b.value)}</span>
                                        </div>
                                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${SEG.cogs}`}
                                                style={{ width: `${opexMax > 0 ? (b.value / opexMax) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>

                {/* The statement itself */}
                <div>
                    <div className="flex items-baseline justify-between gap-4 px-4 md:px-6 py-2 bg-muted/40 border-b border-border">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Akun</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Jumlah</span>
                    </div>

                    {revenueSection && (
                        <Section
                            title={revenueSection.name}
                            accounts={revenueSection.accounts}
                            total={revenueSection.total}
                            fmt={fmt}
                            onAccountClick={handleDrill}
                            defaultOpen
                        />
                    )}

                    {cogsSection && (
                        <Section
                            title={cogsSection.name}
                            accounts={cogsSection.accounts}
                            total={cogsSection.total}
                            fmt={fmt}
                            onAccountClick={handleDrill}
                            isNegative
                        />
                    )}

                    <Subtotal label="Laba Kotor" value={grossProfit} fmt={fmt} comparison={comparison?.grossProfit} />

                    {opexSections.length > 0 && (
                        <Section
                            title="Beban Operasional"
                            accounts={opexSections.flatMap((s: any) => s.accounts)}
                            total={opex}
                            fmt={fmt}
                            onAccountClick={handleDrill}
                            isNegative
                        />
                    )}

                    {otherSection && otherSection.accounts.length > 0 && (
                        <Section
                            title={otherSection.name}
                            accounts={otherSection.accounts}
                            total={otherSection.total}
                            fmt={fmt}
                            onAccountClick={handleDrill}
                        />
                    )}

                    <Subtotal
                        label="Laba Operasional"
                        value={operatingIncome}
                        fmt={fmt}
                        comparison={comparison?.operatingIncome}
                    />

                    {tax > 0 && (
                        <>
                            <div className="flex items-baseline justify-between gap-4 px-4 md:px-6 py-2 border-t border-border/60">
                                <span className="text-[13px] text-muted-foreground">Laba Sebelum Pajak</span>
                                <span className="text-[13px] tabular-nums text-foreground/80">{paren(incomeBeforeTax, fmt)}</span>
                            </div>
                            <div className="flex items-baseline justify-between gap-4 px-4 md:px-6 py-2 border-t border-border/60">
                                <span className="text-[13px] text-muted-foreground">Beban Pajak</span>
                                <span className="text-[13px] tabular-nums text-foreground/80">{paren(-Math.abs(tax), fmt)}</span>
                            </div>
                        </>
                    )}

                    {/* Grand total: double rule, the accounting convention for a final figure. */}
                    <div className="border-t-[3px] border-double border-foreground/70">
                        <div className="flex items-baseline justify-between gap-4 px-4 md:px-6 py-4">
                            <span className="text-xs font-bold uppercase tracking-wide text-foreground">Laba Bersih</span>
                            <span className="text-lg font-bold tabular-nums text-foreground">
                                {paren(netIncome, fmt)}
                                <Delta current={netIncome} prev={comparison?.netIncome} />
                            </span>
                        </div>
                    </div>
                </div>

                {notes.length > 0 && (
                    <div className="border-t border-border px-4 md:px-6 py-4 space-y-2">
                        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Catatan</h3>
                        {notes.map((n, i) => (
                            <p key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="mt-0.5">{n.icon}</span>
                                {n.text}
                            </p>
                        ))}
                    </div>
                )}
            </Card>

            {drill && period && (
                <DrillDownModal
                    accountCode={drill.code}
                    accountName={drill.name}
                    year={period.year}
                    month={period.month}
                    fmt={fmt}
                    onClose={() => setDrill(null)}
                />
            )}
        </>
    )
}
