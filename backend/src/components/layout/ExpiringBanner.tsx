import Link from "next/link";
import { Clock } from "lucide-react";

/**
 * Warns a shop BEFORE its subscription lapses, in the shell where it will
 * actually be seen.
 *
 * The billing page already showed this, but only to someone who thought to open
 * it — which nobody does while things are working. So the first signal a shop
 * got was a save failing, by which point the sale is already interrupted and the
 * conversation starts from frustration instead of a renewal.
 *
 * Deliberately calmer than the lapsed variant of ReadOnlyBanner: nothing is
 * broken yet, and shouting about a week that has not happened trains people to
 * ignore the amber bar that will matter. It shares the informational sky palette
 * with the demo notice, which is safe because the two cannot co-occur — a demo
 * tenant is read-only already, and its subscription runs to 2126.
 */
export function ExpiringBanner({ days }: { days: number }) {
    const when =
        days === 0 ? "hari ini" : days === 1 ? "besok" : `dalam ${days} hari`;

    return (
        <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-100 print:hidden"
        >
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
                <strong className="font-semibold">Langganan berakhir {when}.</strong>{" "}
                {/* Say what stops, not just that something expires — "langganan
                    berakhir" alone reads as billing trivia until the tills stop. */}
                <span className="hidden sm:inline">
                    Setelah itu data tetap bisa dilihat, tetapi penyimpanan perubahan
                    dinonaktifkan.
                </span>
            </span>
            <Link
                href="/settings/billing"
                className="ml-auto shrink-0 rounded-md bg-sky-600 px-3 py-1 font-medium text-white transition-colors hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
                Perpanjang
            </Link>
        </div>
    );
}
