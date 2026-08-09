import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/features";

/**
 * Every route under a paid module must enforce that module's feature.
 *
 * The gap this locks shut was uniform and easy to miss: collection routes were
 * gated while the item routes beside them were not, so `POST /api/services` was
 * refused and `PATCH /api/services/<id>` was not. The UI hides both, which is
 * exactly why it kept surviving review — nothing a shop can click reveals it.
 *
 * Source-scanning rather than calling the handlers: the check is "a guard is
 * present on this path", and standing up a request context per route would test
 * the harness more than the routes.
 */
const GATED_AREAS: { dir: string; feature: FeatureKey; except?: string[] }[] = [
    { dir: "services", feature: "service" },
    { dir: "warranty-claims", feature: "service" },
    { dir: "inventory/passports", feature: "devicePassport" },
    { dir: "inventory/opname", feature: "stockOpname" },
    { dir: "inventory/transfers", feature: "stockTransfer" },
    { dir: "financials/reconciliation", feature: "bankReconciliation" },
    { dir: "approvals", feature: "approvals" },
    { dir: "employees", feature: "hr" },
    { dir: "payrolls", feature: "hr" },
    {
        dir: "technicians",
        feature: "hr",
        except: [
            // Reading the list is a lookup every module that names a technician
            // needs — Servis is Pro, HR is Business, and requiring `hr` here left
            // a Pro shop unable to staff a work order it had paid for.
            "technicians/route.ts",
            // The commission endpoints answer to their own Business feature.
            "technicians/commissions/route.ts",
            "technicians/payout/route.ts",
            "technicians/[id]/commissions/route.ts",
        ],
    },
];

const API_ROOT = join(process.cwd(), "src/app/api");

function routeFiles(dir: string): string[] {
    const abs = join(API_ROOT, dir);
    const out: string[] = [];
    const walk = (d: string, rel: string) => {
        for (const entry of readdirSync(d)) {
            const full = join(d, entry);
            if (statSync(full).isDirectory()) walk(full, `${rel}/${entry}`);
            else if (entry === "route.ts") out.push(`${rel}/route.ts`.replace(/^\//, ""));
        }
    };
    walk(abs, dir);
    return out;
}

describe("paid modules are gated on every route, not just the collection", () => {
    for (const area of GATED_AREAS) {
        const files = routeFiles(area.dir).filter((f) => !area.except?.includes(f));
        it(`${area.dir}/** enforces "${area.feature}" (${files.length} routes)`, () => {
            expect(files.length).toBeGreaterThan(0);
            const missing = files.filter((f) => {
                const src = readFileSync(join(API_ROOT, f), "utf8");
                return !src.includes(`requireFeature("${area.feature}"`);
            });
            expect(missing, `ungated: ${missing.join(", ")}`).toEqual([]);
        });
    }

    it("passes the already-resolved auth context to every feature gate", () => {
        // requireFeature re-runs the entire auth chain — session, store grants,
        // plan — when preAuth is omitted. CLAUDE.md rule 13.
        const bare: string[] = [];
        const walk = (d: string, rel: string) => {
            for (const entry of readdirSync(d)) {
                const full = join(d, entry);
                if (statSync(full).isDirectory()) walk(full, `${rel}/${entry}`);
                else if (entry === "route.ts") {
                    const src = readFileSync(full, "utf8");
                    // A gate with a single argument: requireFeature("x") with no context.
                    if (/requireFeature\(\s*"[a-zA-Z]+"\s*\)/.test(src)) bare.push(`${rel}/${entry}`);
                }
            }
        };
        walk(API_ROOT, "");
        expect(bare, `no preAuth: ${bare.join(", ")}`).toEqual([]);
    });

    it("names only features that exist", () => {
        for (const area of GATED_AREAS) expect(FEATURE_KEYS).toContain(area.feature);
    });
});
