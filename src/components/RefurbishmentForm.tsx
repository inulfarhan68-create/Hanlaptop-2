import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModernSelect } from "@/components/ui/modern-select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wrench, Cpu, HardDrive, Sparkles, RefreshCw, Settings, Plus, Trash2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RefurbishmentFormProps {
    passportId: string;
    serialNumber: string;
    technicians: { id: string; name: string }[];
    onSuccess?: () => void;
    onClose?: () => void;
}

const ACTIVITY_TYPES = [
    { value: 'CLEANING', label: '🧹 Deep Cleaning', icon: Sparkles, desc: 'Pembersihan total termasuk thermal paste', hasSparepart: false },
    { value: 'REPASTA', label: '🔥 Repasta Thermal', icon: RefreshCw, desc: 'Ganti thermal paste CPU/GPU', hasSparepart: true, sparepartCategory: 'Thermal Paste' },
    { value: 'UPGRADE_RAM', label: '📦 Upgrade RAM', icon: Cpu, desc: 'Tambah atau ganti modul RAM', hasSparepart: true, sparepartCategory: 'RAM' },
    { value: 'UPGRADE_SSD', label: '💾 Upgrade SSD', icon: HardDrive, desc: 'Tambah atau ganti SSD', hasSparepart: true, sparepartCategory: 'SSD' },
    { value: 'REPLACE_COMPONENT', label: '🔧 Ganti Komponen', icon: Settings, desc: 'Ganti LCD, keyboard, baterai, dll', hasSparepart: true, sparepartCategory: 'Sparepart' },
    { value: 'OTHER', label: '⚙️ Lainnya', icon: Wrench, desc: 'Service atau perbaikan lain', hasSparepart: false },
];

export function RefurbishmentForm({ passportId, serialNumber, technicians, onSuccess, onClose: _onClose }: RefurbishmentFormProps) {
    const [activityType, setActivityType] = useState<string>('');
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState<number>(0);
    const [componentReplaced, setComponentReplaced] = useState('');
    const [oldSpec, setOldSpec] = useState('');
    const [newSpec, setNewSpec] = useState('');
    const [notes, setNotes] = useState('');
    const [technicianId, setTechnicianId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Sparepart selection
    const [useSparepart, setUseSparepart] = useState(false);
    const [sparepartId, setSparepartId] = useState('');
    const [sparepartQty, setSparepartQty] = useState(1);

    // Fetch sparepart inventory (categories: Thermal Paste, RAM, SSD, Sparepart)
    const { data: sparepartInventory } = useSWR(
        showForm ? `${import.meta.env.VITE_API_URL || ''}/api/inventory?category=Aksesoris&fetchAll=true` : null
    );

    // Filter sparepart based on activity type
    const selectedActivity = ACTIVITY_TYPES.find(a => a.value === activityType);
    const filteredSpareparts = sparepartInventory?.filter((item: any) => {
        if (!selectedActivity?.sparepartCategory) return false;
        const cat = selectedActivity.sparepartCategory.toLowerCase();
        if (cat === 'thermal paste') return item.itemName.toLowerCase().includes('thermal') || item.category === 'Aksesoris';
        if (cat === 'ram') return item.itemName.toLowerCase().includes('ram') || item.category === 'RAM';
        if (cat === 'ssd') return item.itemName.toLowerCase().includes('ssd') || item.category === 'SSD';
        return item.category === 'Aksesoris' || item.category === 'Sparepart';
    }) || [];

    const selectedSparepart = filteredSpareparts.find((s: any) => s.id === sparepartId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activityType || !description) {
            toast.error('Pilih jenis aktivitas dan isi deskripsi');
            return;
        }

        if (useSparepart && sparepartId && cost > 0) {
            // Verify stock
            const sparepart = selectedSparepart;
            if (sparepart && sparepart.quantity < sparepartQty) {
                toast.error(`Stok tidak cukup! Tersedia: ${sparepart.quantity} unit`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/inventory/passports/${passportId}/refurbish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activityType,
                    description,
                    cost: cost || 0,
                    componentReplaced: componentReplaced || null,
                    oldSpec: oldSpec || null,
                    newSpec: newSpec || null,
                    notes: notes || null,
                    technicianId: technicianId || null,
                    // Sparepart data
                    sparepartInventoryId: useSparepart && sparepartId ? sparepartId : null,
                    sparepartQty: useSparepart ? sparepartQty : 0,
                    createJournalEntry: true
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Gagal menyimpan refurbishment');
            }

            // Show success with details
            if (data.sparepartUsed) {
                toast.success(`✅ Refurbishment berhasil! Sparepart "${data.sparepartUsed.name}" x${data.sparepartUsed.qty} deducted.`);
            } else {
                toast.success('✅ Refurbishment berhasil dicatat!');
            }

            setShowForm(false);
            resetForm();
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setActivityType('');
        setDescription('');
        setCost(0);
        setComponentReplaced('');
        setOldSpec('');
        setNewSpec('');
        setNotes('');
        setTechnicianId('');
        setUseSparepart(false);
        setSparepartId('');
        setSparepartQty(1);
    };

    if (!showForm) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(true)}
                className="gap-2"
            >
                <Plus className="h-4 w-4" />
                Catat Refurbishment
            </Button>
        );
    }

    return (
        <Card className="border-blue-200">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            Catat Refurbishment/Upgrade
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            SN: {serialNumber}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setShowForm(false);
                            resetForm();
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Activity Type Selection */}
                    <div className="grid grid-cols-2 gap-2">
                        {ACTIVITY_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => {
                                        setActivityType(type.value);
                                        setComponentReplaced(type.label.replace(/[^\w\s]/g, '').trim());
                                    }}
                                    className={cn(
                                        "p-3 rounded-lg border text-left transition-all",
                                        activityType === type.value
                                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                                            : "border-border hover:border-primary/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">{type.label}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{type.desc}</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Deskripsi *</label>
                        <textarea
                            className="w-full text-sm rounded-lg border bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            rows={2}
                            placeholder="Contoh: Upgrade RAM dari 8GB DDR4 ke 16GB DDR4, SSD dari 256GB ke 512GB NVMe"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    {/* Sparepart Section */}
                    {selectedActivity?.hasSparepart && (
                        <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="useSparepart"
                                    checked={useSparepart}
                                    onChange={(e) => setUseSparepart(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="useSparepart" className="text-xs font-medium flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    Gunakan Sparepart dari Inventori
                                </label>
                            </div>

                            {useSparepart && (
                                <div className="space-y-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Pilih Sparepart</label>
                                        <select
                                            className="w-full text-sm rounded-lg border bg-background px-3 py-2"
                                            value={sparepartId}
                                            onChange={(e) => setSparepartId(e.target.value)}
                                        >
                                            <option value="">-- Pilih Sparepart --</option>
                                            {filteredSpareparts.map((sp: any) => (
                                                <option key={sp.id} value={sp.id}>
                                                    {sp.itemName} (Stok: {sp.quantity}) - Rp {sp.costPrice?.toLocaleString('id-ID') || 0}
                                                </option>
                                            ))}
                                        </select>
                                        {filteredSpareparts.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Tidak ada sparepart tersedia di inventori
                                            </p>
                                        )}
                                    </div>

                                    {sparepartId && selectedSparepart && (
                                        <>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium">Jumlah</label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={selectedSparepart.quantity}
                                                        value={sparepartQty}
                                                        onChange={(e) => setSparepartQty(parseInt(e.target.value) || 1)}
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Stok: {selectedSparepart.quantity}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium">Biaya Service (Rp)</label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Biaya jasa teknisi"
                                                        value={cost || ''}
                                                        onChange={(e) => setCost(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>

                                            {selectedSparepart && (
                                                <div className="flex justify-between items-center text-xs bg-white dark:bg-black/20 p-2 rounded border">
                                                    <span className="text-muted-foreground">Total Biaya:</span>
                                                    <span className="font-bold">
                                                        Rp {((selectedSparepart.costPrice * sparepartQty) + (cost || 0)).toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual cost entry (for activities without sparepart) */}
                    {!selectedActivity?.hasSparepart && cost >= 0 && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Biaya (Rp)</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={cost || ''}
                                onChange={(e) => setCost(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    )}

                    {/* Specs Change (for upgrades) */}
                    {(activityType === 'UPGRADE_RAM' || activityType === 'UPGRADE_SSD') && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Spesifikasi Lama</label>
                                <Input
                                    placeholder="8GB DDR4"
                                    value={oldSpec}
                                    onChange={(e) => setOldSpec(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Spesifikasi Baru</label>
                                <Input
                                    placeholder="16GB DDR4"
                                    value={newSpec}
                                    onChange={(e) => setNewSpec(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Technician */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Teknisi</label>
                        <ModernSelect
                            value={technicianId}
                            onChange={setTechnicianId}
                            placeholder="-- Pilih Teknisi --"
                            options={[
                                { value: '', label: '-- Pilih Teknisi --' },
                                ...technicians.map((t: any) => ({
                                    value: t.id,
                                    label: t.name
                                }))
                            ]}
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting || !activityType || !description}
                            className="flex-1"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowForm(false);
                                resetForm();
                            }}
                        >
                            Batal
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
