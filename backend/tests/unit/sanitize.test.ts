import { describe, it, expect } from "vitest";
import { sanitizeInput } from "@/lib/sanitize";

describe("sanitizeInput (XSS defense)", () => {
    it("strips <script> blocks including their inner content", () => {
        expect(sanitizeInput("<script>alert('xss')</script>Hello")).toBe("Hello");
    });

    it("strips <style> blocks including their inner content", () => {
        expect(sanitizeInput("<style>.a{color:red}</style>Judul")).toBe("Judul");
    });

    it("removes plain HTML tags but keeps the text", () => {
        expect(sanitizeInput("<b>bold</b>")).toBe("bold");
        expect(sanitizeInput("<a href='x'>link</a>")).toBe("link");
    });

    it("leaves plain text untouched", () => {
        expect(sanitizeInput("Laptop Bekas i5")).toBe("Laptop Bekas i5");
    });

    it("returns non-string values unchanged", () => {
        expect(sanitizeInput(123)).toBe(123);
        expect(sanitizeInput(true)).toBe(true);
        expect(sanitizeInput(null)).toBeNull();
    });

    it("recursively sanitizes object string values, preserving other types", () => {
        const input = { name: "<script>steal()</script>Budi", qty: 5, active: true };
        expect(sanitizeInput(input)).toEqual({ name: "Budi", qty: 5, active: true });
    });

    it("recursively sanitizes arrays and nested objects", () => {
        expect(sanitizeInput(["<i>a</i>", "b"])).toEqual(["a", "b"]);
        expect(sanitizeInput({ a: { b: "<p>hi</p>" } })).toEqual({ a: { b: "hi" } });
    });
});
