import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModernSelect } from "@/components/ui/modern-select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wrench, Cpu, HardDrive, Sparkles, RefreshCw, Settings, Plus, Trash2 } from 'lucide-react';
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
    { value: 'CLEANING', label: '🧹 Deep Cleaning', icon: Sparkles, desc: 'Pembersihan total termasuk thermal paste' },
    { value: 'REPASTA', label: '🔥 Repasta Thermal', icon: RefreshCw, desc: 'Ganti thermal paste CPU/GPU' },
    { value: 'UPGRADE_RAM', label: '📦 Upgrade RAM', icon: Cpu, desc: 'Tambah atau ganti modul RAM' },
    { value: 'UPGRADE_SSD', label: '💾 Upgrade SSD', icon: HardDrive, desc: 'Tambah atau ganti SSD' },
    { value: 'REPLACE_COMPONENT', label: '🔧 Ganti Komponen', icon: Settings, desc: 'Ganti LCD, keyboard, baterai, dll' },
    { value: 'OTHER', label: '⚙️ Lainnya', icon: Wrench, desc: 'Service atau perbaikan lain' },
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activityType || !description) {
            toast.error('Pilih jenis aktivitas dan isi deskripsi');
            return;
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
                    technicianId: technicianId || null
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Gagal menyimpan refurbishment');
            }

            toast.success('Refurbishment berhasil dicatat!');
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
                        <CardDescription className="text-xs">
                            SN: {serialNumber}
                        </CardDescription>
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
                                    onClick={() => setActivityType(type.value)}
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

                    {/* Upgrade Details (for RAM/SSD upgrades) */}
                    {(activityType === 'UPGRADE_RAM' || activityType === 'UPGRADE_SSD' || activityType === 'REPLACE_COMPONENT') && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Komponen</label>
                                <Input
                                    placeholder="RAM / SSD / LCD / dll"
                                    value={componentReplaced}
                                    onChange={(e) => setComponentReplaced(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Biaya (Rp)</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={cost || ''}
                                    onChange={(e) => setCost(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Specs Change */}
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

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Catatan Tambahan</label>
                        <textarea
                            className="w-full text-sm rounded-lg border bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            rows={2}
                            placeholder="Catatan tambahan (opsional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting || !activityType || !description}
                            className="flex-1"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Refurbishment'}
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

// Quick upgrade buttons for common actions
export function QuickUpgradeButtons({ passportId, serialNumber, onUpgrade }: {
    passportId: string;
    serialNumber: string;
    onUpgrade: () => void;
}) {
    const quickActions = [
        { type: 'CLEANING', label: 'Cleaning', icon: Sparkles },
        { type: 'REPASTA', label: 'Repasta', icon: RefreshCw },
        { type: 'UPGRADE_SSD', label: 'Upgrade SSD', icon: HardDrive },
        { type: 'UPGRADE_RAM', label: 'Upgrade RAM', icon: Cpu },
    ];

    const handleQuickAction = async (type: string) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/inventory/passports/${passportId}/refurbish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activityType: type,
                    description: `${type === 'CLEANING' ? 'Deep Cleaning' : type === 'REPASTA' ? 'Repasta Thermal' : type === 'UPGRADE_SSD' ? 'Upgrade SSD' : 'Upgrade RAM'} - ${serialNumber}`
                })
            });

            if (!res.ok) throw new Error('Failed');

            toast.success(`${type === 'CLEANING' ? 'Cleaning' : type === 'REPASTA' ? 'Repasta' : 'Upgrade'} berhasil dicatat!`);
            onUpgrade();
        } catch {
            toast.error('Gagal mencatat');
        }
    };

    return (
        <div className="flex gap-2 flex-wrap">
            {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                    <Button
                        key={action.type}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action.type)}
                        className="gap-1 text-xs"
                    >
                        <Icon className="h-3 w-3" />
                        {action.label}
                    </Button>
                );
            })}
        </div>
    );
}
