import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Printer, Settings, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { classifyLaptop } from "@/lib/laptopUtils"
import { TableSkeleton } from "@/components/ui/skeleton"
import { InventoryEmpty, SearchEmpty } from "@/components/ui/empty-state"
import { useNavigate } from "react-router-dom"

interface InventoryTableProps {
  items: any[];
  currentPageItems: any[];
  isLoading: boolean;
  inventoryError: any;
  onRetry: () => void;
  onAdd: () => void;
  searchTerm: string;
  filterCategory: string;
  filterStatus: string;
  
  canWrite: boolean;
  canShowHPP: boolean;
  isStale: boolean;
  
  selectedItemIds: string[];
  setSelectedItemIds: React.Dispatch<React.SetStateAction<string[]>>;

  onViewDetail: (item: any) => void;
  onPrintBarcode: (item: any) => void;
  onEdit: (item: any) => void;
  onERPConfig: (item: any) => void;
  onDelete: (id: string) => void;
}

export function InventoryTable({
  items,
  currentPageItems,
  isLoading,
  inventoryError,
  onRetry,
  onAdd,
  searchTerm,
  filterCategory,
  filterStatus,
  canWrite,
  canShowHPP,
  isStale,
  selectedItemIds,
  setSelectedItemIds,
  onViewDetail,
  onPrintBarcode,
  onEdit,
  onERPConfig,
  onDelete
}: InventoryTableProps) {
  const navigate = useNavigate();

  if (inventoryError) {
    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-destructive font-semibold text-lg mb-2">Gagal memuat data inventaris</p>
            <p className="text-muted-foreground text-sm mb-4">{inventoryError.message || "Terjadi kesalahan saat mengambil data."}</p>
            <Button onClick={onRetry} variant="outline">Coba Lagi</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="bg-card rounded-xl border shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 z-30 bg-muted/95 shadow-sm">
              <TableRow>
                <TableHead className="py-2 px-2 text-[10px] w-[50px]">SKU/ID</TableHead>
                <TableHead className="py-2 px-2 text-[10px] min-w-[180px]">Nama Barang</TableHead>
                <TableHead className="py-2 px-2 text-[10px]">Kategori</TableHead>
                <TableHead className="py-2 px-2 text-[10px]">Qty</TableHead>
                <TableHead className="py-2 px-2 text-[10px]">Harga Jual</TableHead>
                <TableHead className="py-2 px-1 text-[10px] w-[40px] text-center">Status</TableHead>
                <TableHead className="text-right py-2 px-2 text-[10px] w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeleton rows={8} cols={7} />
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="bg-card rounded-xl border shadow-sm flex-1">
          <InventoryEmpty onAdd={onAdd} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-2">
      <div className={`bg-card rounded-xl border shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden [&>div]:flex-1 [&>div]:overflow-auto [&>div]:border-0 [&>div]:rounded-none transition-opacity duration-200 ${isStale ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <Table>
          <TableHeader className="sticky top-0 z-30 bg-muted/95 shadow-sm">
            <TableRow>
              <TableHead className="py-2 px-2 text-[10px] w-[30px]">
                {canWrite && (
                  <input 
                    type="checkbox" 
                    checked={currentPageItems.length > 0 && currentPageItems.every(item => selectedItemIds.includes(item.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const pageIds = currentPageItems.map(item => item.id);
                        setSelectedItemIds(prev => Array.from(new Set([...prev, ...pageIds])));
                      } else {
                        const pageIds = currentPageItems.map(item => item.id);
                        setSelectedItemIds(prev => prev.filter(id => !pageIds.includes(id)));
                      }
                    }}
                    className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                )}
              </TableHead>
              <TableHead className="py-2 px-2 text-[10px] md:text-[11px] w-[50px]">SKU/ID</TableHead>
              <TableHead className="py-2 px-2 text-[10px] md:text-[11px] min-w-[180px] sm:min-w-[250px]">Nama Barang</TableHead>
              <TableHead className="py-2 px-2 text-[10px] md:text-[11px] whitespace-nowrap">Kategori</TableHead>
              <TableHead className="py-2 px-2 text-[10px] md:text-[11px]">Qty</TableHead>
              {canShowHPP && <TableHead className="py-2 px-2 text-[10px] md:text-[11px] whitespace-nowrap">Cost (HPP)</TableHead>}
              <TableHead className="py-2 px-2 text-[10px] md:text-[11px] whitespace-nowrap">Harga Jual</TableHead>
              <TableHead className="py-2 px-1 text-[10px] md:text-[11px] w-[40px] md:w-[60px] text-center">Status</TableHead>
              {localStorage.getItem('selectedStoreId') !== 'all' && <TableHead className="text-right py-2 px-2 text-[10px] md:text-[11px] w-[50px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPageItems.map((item: any) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="py-1.5 px-2">
                  {canWrite && (
                    <input 
                      type="checkbox" 
                      checked={selectedItemIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIds(prev => [...prev, item.id]);
                        } else {
                          setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium text-[10px] md:text-[11px] py-1.5 px-2">{item.id.substring(0, 8).toUpperCase()}</TableCell>
                <TableCell className="py-1.5 px-2">
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => onViewDetail(item)}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.itemName} className="w-8 h-8 rounded object-cover shadow-sm border shrink-0 bg-slate-100" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted border flex items-center justify-center text-[10px] text-muted-foreground shrink-0 select-none">💻</div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="font-medium text-[11px] md:text-[12px] text-primary hover:underline decoration-primary/50 underline-offset-2 transition-all leading-tight">
                        {item.itemName}
                      </span>
                    {item.category === "Laptop Bekas" && item.specs && (() => {
                      const conditionMatch = item.specs.match(/Kondisi:\s*([^|]+)/);
                      const condition = conditionMatch ? conditionMatch[1].trim() : null;
                      if (!condition) return null;
                      const isMinus = condition.toLowerCase().includes("minus");
                      const isGaransi = condition.toLowerCase().includes("garansi resmi");
                      return (
                        <span 
                          className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold tracking-wide border whitespace-nowrap ${
                            isMinus 
                              ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50" 
                              : isGaransi
                              ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50"
                              : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50"
                          }`}
                          title={`Kondisi: ${condition}`}
                        >
                          {isMinus ? "Minus" : isGaransi ? "Garansi" : "Normal"}
                        </span>
                      )
                    })()}
                    {item.isConsignment && (
                      <span className="bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:border-fuchsia-800/50 px-1 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">
                        Titip Jual
                      </span>
                    )}
                    {item.tracksSerialNumber && (
                      <button
                        onClick={() => navigate('/passports')}
                        className="bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 px-1 py-0.5 rounded text-[8px] font-bold whitespace-nowrap hover:bg-blue-200 dark:hover:bg-blue-800 cursor-pointer transition-colors"
                      >
                        🔍 Lacak SN
                      </button>
                    )}
                    {item.qcGrade && (
                      <span className={`px-1 py-0.5 rounded text-[8px] font-bold whitespace-nowrap border ${
                        item.qcGrade === 'A' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        item.qcGrade === 'B' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' :
                        item.qcGrade === 'C' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        QC: {item.qcGrade}
                      </span>
                    )}
                    {!item.isPublished && (
                      <span className="bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 px-1 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">
                        Hidden
                      </span>
                    )}
                    {item.category === "Laptop Bekas" && classifyLaptop(item.itemName, item.specs || "", item.sellingPrice).map((rec: any) => (
                      <span 
                        key={rec.id} 
                        className={`px-1 py-0.5 rounded text-[8px] font-bold border whitespace-nowrap ${rec.color}`}
                      >
                        {rec.name}
                      </span>
                    ))}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <span className={`inline-flex items-center justify-center px-1 py-0.5 rounded text-[8px] md:text-[9px] font-semibold whitespace-nowrap border ${
                    item.category === 'Laptop Bekas' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' 
                    : item.category === 'Aksesoris' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                  }`}>
                    {item.category === 'Laptop Bekas' ? 'Laptop' : item.category}
                  </span>
                </TableCell>
                <TableCell className="font-bold text-[11px] md:text-[12px] py-1.5 px-2">
                  <div className="flex items-center gap-1">
                    <span>{item.quantity}</span>
                    {item.quantity <= (item.minStock !== undefined ? item.minStock : 2) && item.quantity > 0 && (
                      <span className="text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1 rounded font-bold whitespace-nowrap">Menipis</span>
                    )}
                    {item.quantity === 0 && (
                      <span className="text-[8px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-1 rounded font-bold whitespace-nowrap">Habis</span>
                    )}
                  </div>
                </TableCell>
                {canShowHPP && <TableCell className="text-[10px] md:text-[11px] py-1.5 px-2 tabular-nums">{formatCurrency(item.costPrice)}</TableCell>}
                <TableCell className="text-[10px] md:text-[11px] py-1.5 px-2 tabular-nums">{formatCurrency(item.sellingPrice)}</TableCell>
                <TableCell className="py-1.5 px-1 flex justify-center">
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full ${
                    item.quantity === 0 ? 'bg-destructive/10' : item.quantity <= (item.minStock !== undefined ? item.minStock : 2) ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                  }`} title={item.quantity === 0 ? 'Habis' : item.quantity <= (item.minStock !== undefined ? item.minStock : 2) ? 'Menipis' : 'Aman'}>
                    <span className={`h-2 w-2 rounded-full ${
                      item.quantity === 0 ? 'bg-destructive' : item.quantity <= (item.minStock !== undefined ? item.minStock : 2) ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                  </span>
                </TableCell>
                {localStorage.getItem('selectedStoreId') !== 'all' && (
                  <TableCell className="text-right py-1.5 px-2">
                    <div className="flex justify-end gap-0.5">
                      {item.barcode && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-emerald-500/10 hover:text-emerald-600 rounded" onClick={() => onPrintBarcode(item)} title="Cetak Barcode">
                          <Printer className="h-3 w-3" />
                        </Button>
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10 hover:text-primary rounded" onClick={() => onEdit(item)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-indigo-500/10 hover:text-indigo-600 rounded" onClick={() => onERPConfig(item)} title="Pengaturan ERP (Katalog, QC, Konsinyasi)">
                          <Settings className="h-3 w-3" />
                        </Button>
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive rounded" onClick={() => onDelete(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {currentPageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <SearchEmpty query={searchTerm || filterCategory || filterStatus} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
