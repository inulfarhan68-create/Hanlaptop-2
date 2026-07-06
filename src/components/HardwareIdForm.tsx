import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Wifi, Key, Battery, Cpu, Copy, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HardwareIdFormProps {
    passportId: string;
    initialData?: {
        macAddress?: string | null;
        windowsKey?: string | null;
        batterySerial?: string | null;
        motherboardSerial?: string | null;
    };
    onSave: (data: {
        macAddress?: string | null;
        windowsKey?: string | null;
        batterySerial?: string | null;
        motherboardSerial?: string | null;
    }) => Promise<void>;
    onClose?: () => void;
}

export function HardwareIdForm({ passportId: _passportId, initialData, onSave, onClose }: HardwareIdFormProps) {
    const [macAddress, setMacAddress] = useState(initialData?.macAddress || '');
    const [windowsKey, setWindowsKey] = useState(initialData?.windowsKey || '');
    const [batterySerial, setBatterySerial] = useState(initialData?.batterySerial || '');
    const [motherboardSerial, setMotherboardSerial] = useState(initialData?.motherboardSerial || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await onSave({
                macAddress: macAddress || null,
                windowsKey: windowsKey || null,
                batterySerial: batterySerial || null,
                motherboardSerial: motherboardSerial || null,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const hasAnyValue = macAddress || windowsKey || batterySerial || motherboardSerial;

    return (
        <Card className="border-purple-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Hardware ID (Laptop)
                </CardTitle>
                <CardDescription className="text-xs">
                    Masukkan informasi hardware unik untuk warranty claim
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* MAC Address */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium flex items-center gap-1">
                            <Wifi className="h-3 w-3" />
                            MAC Address
                            <Badge variant="outline" className="text-[10px] ml-1">WiFi/Bluetooth</Badge>
                        </label>
                        <div className="relative">
                            <Input
                                placeholder="AA:BB:CC:DD:EE:FF"
                                value={macAddress}
                                onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                                className="font-mono"
                            />
                            {macAddress && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                    onClick={() => copyToClipboard(macAddress, 'mac')}
                                >
                                    {copiedField === 'mac' ? (
                                        <Check className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </Button>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Cek via: cmd → getmac atau ipconfig /all
                        </p>
                    </div>

                    {/* Windows Product Key */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium flex items-center gap-1">
                            <Key className="h-3 w-3" />
                            Windows Product Key
                            <Badge variant="outline" className="text-[10px] ml-1">Digital License</Badge>
                        </label>
                        <Input
                            placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                            value={windowsKey}
                            onChange={(e) => setWindowsKey(e.target.value.toUpperCase())}
                            className="font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Cek via: Settings → System → Activation, atau via PowerShell: (Get-WmiObject -query 'select * from SoftwareLicensingService').OA3xOriginalProductKey
                        </p>
                    </div>

                    {/* Battery Serial */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium flex items-center gap-1">
                            <Battery className="h-3 w-3" />
                            Battery Serial
                        </label>
                        <Input
                            placeholder="Serial number baterai"
                            value={batterySerial}
                            onChange={(e) => setBatterySerial(e.target.value.toUpperCase())}
                            className="font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Cek via: powercfg /batteryreport atau buka battery compartment
                        </p>
                    </div>

                    {/* Motherboard Serial */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            Motherboard Serial
                        </label>
                        <Input
                            placeholder="Serial number motherboard"
                            value={motherboardSerial}
                            onChange={(e) => setMotherboardSerial(e.target.value.toUpperCase())}
                            className="font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Cek via: cmd → wmic baseboard get serialnumber
                        </p>
                    </div>

                    {/* Tips */}
                    {!hasAnyValue && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="text-xs">
                                    <p className="font-medium text-blue-700 dark:text-blue-400">Tips:</p>
                                    <p className="text-blue-600 dark:text-blue-500 mt-1">
                                        Hardware ID penting untuk klaim garansi ke manufacturer (Dell, HP, Lenovo, dll).
                                        Informasi ini bisa ditemukan di BIOS atau melalui command prompt.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Hardware ID'}
                        </Button>
                        {onClose && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Batal
                            </Button>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

// Compact version for inline display
export function HardwareIdBadge({ macAddress, windowsKey }: {
    macAddress?: string | null;
    windowsKey?: string | null;
}) {
    const hasMac = !!macAddress;
    const hasKey = !!windowsKey;

    if (!hasMac && !hasKey) {
        return (
            <Badge variant="outline" className="text-[10px]">
                Tidak ada Hardware ID
            </Badge>
        );
    }

    return (
        <div className="flex gap-1 flex-wrap">
            {hasMac && (
                <Badge variant="secondary" className="text-[10px] gap-1 font-mono">
                    <Wifi className="h-2.5 w-2.5" />
                    {macAddress.slice(0, 8)}...
                </Badge>
            )}
            {hasKey && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                    <Key className="h-2.5 w-2.5" />
                    Windows
                </Badge>
            )}
        </div>
    );
}
