"use client";

import { Card } from "@/components/ui/card"
import { ChevronRight, ChevronDown, Search, CheckCircle2, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { DrillDownModal } from "./DrillDownModal"

interface BalanceSheetReportProps {
    data: any
    fmt: (v: number) => string
    isLoading: boolean
}

/** A collapsible account group: header line + indented account rows. */
function Group({
    title,
    accounts,
    total,
    fmt,
    defaultOpen = true,
    onAccountClick,
}: {
    title: string
    accounts: any[]
    total: number
    fmt: (v: number) => string
    defaultOpen?: boolean
    onAccountClick?: (account: any) => void
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="border-t border-border/60">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-baseline justify-between gap-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
            >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    {isOpen
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    {title}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-foreground shrink-0">{fmt(total)}</span>
            </button>

            {isOpen && accounts.length > 0 && (
                <div className="pb-1">
                    {accounts.map((account: any) => (
                        <div
                            key={account.code}
                            onClick={() => onAccountClick?.(account)}
                            className={`group flex items-baseline justify-between gap-4 pl-7 py-1.5 text-[13px] hover:bg-muted/40 transition-colors ${onAccountClick ? "cursor-pointer" : ""}`}
                        >
                            <span className="text-muted-foreground inline-flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{account.name}</span>
                                {onAccountClick && (
                                    <Search className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
                                )}
                            </span>
                            <span className="tabular-nums text-foreground/80 shrink-0">{fmt(account.amount)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export function BalanceSheetReport({ data, fmt, isLoading }: BalanceSheetReportProps) {
    const [drill, setDrill] = useState<{ code: string; name: string } | null>(null)
    const handleDrill = (account: any) => setDrill({ code: account.code, name: account.name })

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
        assets = { current: [], fixed: [], totalCurrent: 0, totalFixed: 0, total: 0 },
        liabilities = { current: [], longTerm: [], totalCurrent: 0, totalLongTerm: 0, total: 0 },
        equity = { accounts: [], total: 0, calculated: 0 },
        isBalanced = false,
        balanceEquation,
        period,
    } = data

    const totalLiabilitiesAndEquity = liabilities.total + equity.total

    const currentRatio =
        liabilities.totalCurrent > 0 ? assets.totalCurrent / liabilities.totalCurrent : assets.totalCurrent > 0 ? 99 : 0
    const debtToEquity = equity.total > 0 ? liabilities.total / equity.total : liabilities.total > 0 ? 99 : 0
    const workingCapital = assets.totalCurrent - liabilities.totalCurrent

    const periodLabel = period
        ? new Date(period.year, period.month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })
        : "—"

    // Notes — status colour always ships with an icon + label, never colour alone.
    const notes: { icon: React.ReactNode; text: string }[] = []
    if (currentRatio < 1.2) {
        notes.push({
            icon: <AlertTriangle className="h-3.5 w-3.5 text-[#ec835a] shrink-0" />,
            text: "Aset lancar tipis dibanding utang lancar — percepat penagihan piutang.",
        })
    } else if (currentRatio > 2) {
        notes.push({
            icon: <CheckCircle2 className="h-3.5 w-3.5 text-[#0ca30c] shrink-0" />,
            text: "Likuiditas kuat — aset lancar mencukupi kewajiban jangka pendek.",
        })
    }
    if (debtToEquity > 1.5) {
        notes.push({
            icon: <AlertTriangle className="h-3.5 w-3.5 text-[#ec835a] shrink-0" />,
            text: "Liabilitas dominan terhadap ekuitas — tahan penambahan utang baru.",
        })
    } else {
        notes.push({
            icon: <CheckCircle2 className="h-3.5 w-3.5 text-[#0ca30c] shrink-0" />,
            text: "Struktur modal didominasi ekuitas — risiko kredit terjaga.",
        })
    }

    const ratios = [
        { label: "Rasio Lancar", value: `${currentRatio.toFixed(2)}×` },
        { label: "Utang / Ekuitas", value: `${debtToEquity.toFixed(2)}×` },
        { label: "Modal Kerja Neto", value: fmt(workingCapital) },
    ]

    return (
        <Card className="border-border shadow-none overflow-hidden">
            {/* Document header */}
            <header className="px-4 md:px-6 py-5 border-b border-border">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold tracking-tight text-foreground">Neraca</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Posisi keuangan per {periodLabel} · dalam Rupiah
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {isBalanced
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-[#0ca30c]" />
                            : <AlertTriangle className="h-3.5 w-3.5 text-[#d03b3b]" />}
                        {isBalanced ? "Seimbang" : "Tidak seimbang"}
                    </span>
                </div>
            </header>

            {/* Ratio strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
                {ratios.map((r) => (
                    <div key={r.label} className="px-4 md:px-6 py-4">
                        <div className="text-[11px] text-muted-foreground">{r.label}</div>
                        <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">{r.value}</div>
                    </div>
                ))}
            </div>

            {/* The statement — Aktiva | Pasiva */}
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-border">
                <section className="px-4 md:px-6 py-5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Aset</h3>
                    <div className="mt-2">
                        {assets.current.length > 0 && (
                            <Group title="Aset Lancar" accounts={assets.current} total={assets.totalCurrent} fmt={fmt} onAccountClick={handleDrill} />
                        )}
                        {assets.fixed.length > 0 && (
                            <Group title="Aset Tetap (Neto)" accounts={assets.fixed} total={assets.totalFixed} fmt={fmt} onAccountClick={handleDrill} />
                        )}
                        <div className="flex items-baseline justify-between gap-4 border-t-[3px] border-double border-foreground/70 pt-3 mt-1">
                            <span className="text-xs font-bold uppercase tracking-wide text-foreground">Total Aset</span>
                            <span className="text-[15px] font-bold tabular-nums text-foreground">{fmt(assets.total)}</span>
                        </div>
                    </div>
                </section>

                <section className="px-4 md:px-6 py-5 border-t lg:border-t-0 border-border">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Kewajiban &amp; Ekuitas
                    </h3>
                    <div className="mt-2">
                        {liabilities.current.length > 0 && (
                            <Group title="Utang Lancar" accounts={liabilities.current} total={liabilities.totalCurrent} fmt={fmt} onAccountClick={handleDrill} />
                        )}
                        {liabilities.longTerm.length > 0 && (
                            <Group title="Utang Jangka Panjang" accounts={liabilities.longTerm} total={liabilities.totalLongTerm} fmt={fmt} onAccountClick={handleDrill} />
                        )}
                        {equity.accounts.length > 0 && (
                            <Group title="Ekuitas" accounts={equity.accounts} total={equity.total} fmt={fmt} onAccountClick={handleDrill} />
                        )}
                        <div className="flex items-baseline justify-between gap-4 border-t-[3px] border-double border-foreground/70 pt-3 mt-1">
                            <span className="text-xs font-bold uppercase tracking-wide text-foreground">Total Kewajiban &amp; Ekuitas</span>
                            <span className="text-[15px] font-bold tabular-nums text-foreground">{fmt(totalLiabilitiesAndEquity)}</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* Accounting equation check */}
            {balanceEquation && (
                <div className="border-t border-border px-4 md:px-6 py-3 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Aset</span>
                    <span className="font-semibold tabular-nums text-foreground">{fmt(balanceEquation.assets)}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="text-muted-foreground">Kewajiban</span>
                    <span className="font-semibold tabular-nums text-foreground">{fmt(balanceEquation.liabilities)}</span>
                    <span className="text-muted-foreground">+</span>
                    <span className="text-muted-foreground">Ekuitas</span>
                    <span className="font-semibold tabular-nums text-foreground">{fmt(balanceEquation.equity)}</span>
                </div>
            )}

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
        </Card>
    )
}
