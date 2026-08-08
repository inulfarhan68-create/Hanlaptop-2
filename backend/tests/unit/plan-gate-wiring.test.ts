import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROUTE_FEATURE } from "@/lib/route-features";

/**
 * The sidebar marking a menu locked and the page refusing to render are two
 * separate mechanisms, and only the second one actually holds — a bookmark or a
 * typed URL skips the menu entirely. If they drift apart the failure is silent in
 * the direction that matters (the entry looks locked while the page stays wide
 * open), so pin them to each other here rather than trusting review.
 */
describe("plan gating is wired to every route the sidebar locks", () => {
    for (const [href, feature] of Object.entries(ROUTE_FEATURE)) {
        it(`${href} gates on "${feature}"`, () => {
            const path = join(process.cwd(), "src/app/(admin)", href, "page.tsx");
            const source = readFileSync(path, "utf8");
            expect(source).toContain(`planAllows(planUser, "${feature}")`);
            expect(source).toContain(`<PlanUpsell feature="${feature}" />`);
        });
    }
});
