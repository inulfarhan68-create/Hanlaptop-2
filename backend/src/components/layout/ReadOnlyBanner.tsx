import Link from "next/link";
import { AlertTriangle, Eye } from "lucide-react";

export type ReadOnlyReason = "demo" | "subscription";

/**
 * Explains why the app refuses to save. Without it a locked tenant just sees
 * buttons fail: the API returns 403 from requirePermission/requireWritable, and
 * nothing on screen says why or what to do about it.
 *
 * Pure presentation: the state is resolved in the (admin) layout on the server
 * and passed down, so there is no fetch and no flash of a wrong state on first
 * paint.
 */
export function ReadOnlyBanner({ reason }: { reason: ReadOnlyReason }) {
    const isSubscription = reason === "subscription";

    return (
        <div
            role="status"
            className={
                isSubscription
                    ? "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100 print:hidden"
                    : "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-100 print:hidden"
            }
        >
            {isSubscription ? (
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
                <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}

            {isSubscription ? (
                <>
                    <span className="min-w-0">
                        <strong className="font-semibold">Langganan tidak aktif.</strong>{" "}
                        {/* The reassurance matters (a shop fearing lost data panics), but it
                            is not worth 130px of an 812px phone screen for a permanent bar. */}
                        <span className="hidden sm:inline">
                            Data Anda tetap aman dan bisa dilihat serta diekspor, tetapi
                            penyimpanan perubahan dinonaktifkan.
                        </span>
                        <span className="sm:hidden">Perubahan tidak tersimpan.</span>
                    </span>
                    <Link
                        href="/settings/billing"
                        className="ml-auto shrink-0 rounded-md bg-amber-600 px-3 py-1 font-medium text-white transition-colors hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                        Perpanjang langganan
                    </Link>
                </>
            ) : (
                <span>
                    <strong className="font-semibold">Mode demo.</strong>{" "}
                    Silakan jelajahi seluruh fitur — perubahan data dinonaktifkan.
                </span>
            )}
        </div>
    );
}
