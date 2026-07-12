// Sparepart shape used throughout the service UI.
export interface UIPart {
  id: string | null;
  name: string;
  price: number;
  qty: number;
}

/**
 * Read a service order's spareparts, preferring the relational `parts` array
 * returned by the API and falling back to the legacy `[Spareparts: [...]]` JSON
 * embedded in `notes` for orders created before the service_parts table existed.
 */
export function normalizeServiceParts(order: any): UIPart[] {
  const rel = order?.parts;
  if (Array.isArray(rel) && rel.length > 0) {
    return rel.map((p: any) => ({
      id: p.inventoryId ?? null,
      name: p.itemName ?? "",
      price: Number(p.unitPrice) || 0,
      qty: Number(p.quantity) || 1,
    }));
  }

  const notes: string = order?.notes || "";
  const m = notes.match(/\[Spareparts:\s*(\[[\s\S]*?\])\]/);
  if (m) {
    try {
      const list = JSON.parse(m[1]);
      if (Array.isArray(list)) {
        return list.map((p: any) => ({
          id: p.id ?? null,
          name: p.name ?? "",
          price: Number(p.price) || 0,
          qty: Number(p.qty) || 1,
        }));
      }
    } catch {
      /* ignore malformed legacy JSON */
    }
  }
  return [];
}
