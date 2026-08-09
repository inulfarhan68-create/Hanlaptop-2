import { describe, it, expect } from "vitest";
import { pickIdentity, clause, fillTemplate } from "@/lib/shop-identity";

describe("pickIdentity", () => {
    it("takes the first non-blank candidate", () => {
        expect(pickIdentity("Ruang Laptop", "cached")).toBe("Ruang Laptop");
        expect(pickIdentity(null, "cached")).toBe("cached");
        expect(pickIdentity(undefined, "", "  ", "third")).toBe("third");
    });

    it("trims, so a whitespace-only value is not a name", () => {
        expect(pickIdentity("  Toko A  ")).toBe("Toko A");
        expect(pickIdentity("   ")).toBeNull();
    });

    it("returns null rather than inventing anything", () => {
        // The whole point: no candidate means we do not know, and rule 16 says
        // the caller must then say nothing.
        expect(pickIdentity()).toBeNull();
        expect(pickIdentity(null, undefined, "")).toBeNull();
    });
});

describe("clause", () => {
    it("renders the wrapped value when known", () => {
        expect(clause(", kami dari *", "Ruang Laptop", "*")).toBe(", kami dari *Ruang Laptop*");
    });

    it("disappears entirely when unknown", () => {
        // `?? ""` would leave `kami dari **` in a message going to a customer.
        expect(clause(", kami dari *", null, "*")).toBe("");
    });

    it("composes into a sentence that reads either way", () => {
        const withName = `Halo Pak Budi${clause(", kami dari *", "Toko A", "*")}. Ingin konfirmasi.`;
        const without = `Halo Pak Budi${clause(", kami dari *", null, "*")}. Ingin konfirmasi.`;
        expect(withName).toBe("Halo Pak Budi, kami dari *Toko A*. Ingin konfirmasi.");
        expect(without).toBe("Halo Pak Budi. Ingin konfirmasi.");
        expect(without).not.toContain("**");
    });
});

describe("fillTemplate", () => {
    const template = "Halo Kak {nama}, ini dengan *{toko}*. Nota {nota}.";

    it("substitutes every placeholder it can", () => {
        const { text, missing } = fillTemplate(template, {
            nama: "Budi",
            toko: "Ruang Laptop",
            nota: "INV/2026/08/001",
        });
        expect(text).toBe("Halo Kak Budi, ini dengan *Ruang Laptop*. Nota INV/2026/08/001.");
        expect(missing).toEqual([]);
    });

    it("reports a missing value instead of blanking it", () => {
        // The template is the shop's own sentence and expects a name; an empty
        // substitution produces `ini dengan **`, so the caller must refuse.
        const { missing } = fillTemplate(template, { nama: "Budi", toko: null, nota: "X" });
        expect(missing).toEqual(["toko"]);
    });

    it("ignores a missing value the template never asked for", () => {
        const { text, missing } = fillTemplate("Halo Kak {nama}.", { nama: "Budi", toko: null });
        expect(text).toBe("Halo Kak Budi.");
        expect(missing).toEqual([]);
    });

    it("replaces every occurrence, not just the first", () => {
        const { text } = fillTemplate("{toko} — {toko}", { toko: "Toko A" });
        expect(text).toBe("Toko A — Toko A");
    });
});
