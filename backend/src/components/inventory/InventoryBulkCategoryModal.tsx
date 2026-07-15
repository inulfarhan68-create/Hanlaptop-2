import { Button } from "@/components/ui/button"
import { ModernSelect } from "@/components/ui/modern-select"

interface InventoryBulkCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  bulkCategoryVal: string;
  setBulkCategoryVal: (val: string) => void;
  isBulkSubmitting: boolean;
  onSubmit: () => void;
}

export function InventoryBulkCategoryModal({
  isOpen,
  onClose,
  selectedCount,
  bulkCategoryVal,
  setBulkCategoryVal,
  isBulkSubmitting,
  onSubmit
}: InventoryBulkCategoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-lg border p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold mb-4">Ubah Kategori Massal ({selectedCount} Barang)</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Pilih Kategori Baru</label>
            <ModernSelect
              value={bulkCategoryVal}
              onChange={(val) => setBulkCategoryVal(val)}
              options={[
                { value: "Laptop Bekas", label: "Laptop Bekas" },
                { value: "Sparepart", label: "Sparepart" },
                { value: "Aksesoris", label: "Aksesoris" }
              ]}
              placeholder="-- Pilih Kategori --"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isBulkSubmitting}>
              Batal
            </Button>
            <Button size="sm" onClick={onSubmit} disabled={isBulkSubmitting || !bulkCategoryVal}>
              {isBulkSubmitting ? "Mengupdate..." : "Ubah Kategori"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
