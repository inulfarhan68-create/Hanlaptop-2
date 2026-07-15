import { Button } from "@/components/ui/button"
import { MarkdownTab } from "@/components/inventory/MarkdownTab"

interface InventoryMarkdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryMarkdownModal({ isOpen, onClose }: InventoryMarkdownModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">Markdown Liquidator</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>✕</Button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <MarkdownTab />
        </div>
      </div>
    </div>
  )
}
