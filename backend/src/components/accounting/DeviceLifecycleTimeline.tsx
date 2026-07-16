"use client";

import { motion } from "framer-motion";
import { Package, ShieldCheck, Wrench, ShoppingCart, RefreshCw, AlertCircle, CheckCircle2, Clock, Monitor, Battery, Wifi, Speaker, Mic, Fingerprint, HardDrive, Cpu, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TimelineEvent {
    id: string;
    type: 'STATUS_CHANGE' | 'QC' | 'REFURBISH' | 'WARRANTY' | 'SALE';
    title: string;
    description: string | null;
    date: Date | string;
    actor: string;
    data: any;
}

interface DeviceLifecycleTimelineProps {
    events: TimelineEvent[];
    healthScore?: number;
    className?: string;
}

export function DeviceLifecycleTimeline({ events, healthScore, className }: DeviceLifecycleTimelineProps) {
    const getEventIcon = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'STATUS_CHANGE':
                return { icon: RefreshCw, bg: 'bg-slate-500', color: 'text-white' };
            case 'QC':
                return { icon: ShieldCheck, bg: 'bg-emerald-500', color: 'text-white' };
            case 'REFURBISH':
                return { icon: Wrench, bg: 'bg-blue-500', color: 'text-white' };
            case 'WARRANTY':
                return { icon: AlertCircle, bg: 'bg-orange-500', color: 'text-white' };
            case 'SALE':
                return { icon: ShoppingCart, bg: 'bg-purple-500', color: 'text-white' };
            default:
                return { icon: Package, bg: 'bg-gray-500', color: 'text-white' };
        }
    };

    const getHealthColor = (score?: number) => {
        if (!score) return 'text-slate-500';
        if (score >= 80) return 'text-emerald-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className={cn("space-y-6", className)}>
            {/* Health Score Card */}
            {healthScore !== undefined && (
                <Card className="border-gradient-to-r from-primary/20 to-emerald-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold",
                                    healthScore >= 80 ? "bg-emerald-100 text-emerald-600" :
                                    healthScore >= 60 ? "bg-yellow-100 text-yellow-600" :
                                    "bg-red-100 text-red-600"
                                )}>
                                    {healthScore}%
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Device Health Score</p>
                                    <p className={cn("text-2xl font-bold", getHealthColor(healthScore))}>
                                        {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Attention'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {healthScore >= 80 && <Badge className="bg-emerald-500">✓ Lulus QC</Badge>}
                                {healthScore >= 60 && healthScore < 80 && <Badge className="bg-yellow-500">⚠ Perhatian</Badge>}
                                {healthScore < 60 && <Badge className="bg-red-500">✗ Perlu Servis</Badge>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Timeline Perjalanan Perangkat
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-emerald-500 to-slate-300" />

                        <div className="space-y-6 pb-4">
                            {events.map((event, index) => {
                                const { icon: Icon, bg, color } = getEventIcon(event.type);

                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="relative pl-10"
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-background z-10",
                                            bg
                                        )}>
                                            <Icon className={cn("h-4 w-4", color)} />
                                        </div>

                                        {/* Content */}
                                        <div className="bg-muted/30 rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-sm">{event.title}</h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {new Date(event.date).toLocaleDateString('id-ID', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {event.actor}
                                                </Badge>
                                            </div>

                                            {event.description && (
                                                <p className="text-sm text-muted-foreground mt-2 italic">
                                                    "{event.description}"
                                                </p>
                                            )}

                                            {/* Event-specific details */}
                                            {event.type === 'QC' && event.data && (
                                                <QCDetails data={event.data} />
                                            )}

                                            {event.type === 'REFURBISH' && event.data && (
                                                <RefurbishDetails data={event.data} />
                                            )}

                                            {event.type === 'WARRANTY' && event.data && (
                                                <WarrantyDetails data={event.data} />
                                            )}

                                            {event.type === 'SALE' && event.data && (
                                                <SaleDetails data={event.data} />
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {events.length === 0 && (
                                <div className="pl-10 text-muted-foreground italic text-center py-8">
                                    Belum ada riwayat perjalanan perangkat
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// QC Details Component
function QCDetails({ data }: { data: any }) {
    const componentIcons: Record<string, { icon: any; label: string }> = {
        touchpad: { icon: Cpu, label: 'Touchpad' },
        speaker: { icon: Speaker, label: 'Speaker' },
        mic: { icon: Mic, label: 'Microphone' },
        bluetooth: { icon: Wifi, label: 'Bluetooth' },
        webcam: { icon: Monitor, label: 'Webcam' },
        hdmi: { icon: Monitor, label: 'HDMI' },
        charging: { icon: Battery, label: 'Charging' },
        fingerprint: { icon: Fingerprint, label: 'Fingerprint' }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PASS':
                return <Badge className="bg-emerald-500 text-xs">✓ PASS</Badge>;
            case 'FAIL':
                return <Badge className="bg-red-500 text-xs">✗ FAIL</Badge>;
            default:
                return <Badge variant="outline" className="text-xs">- Not Tested</Badge>;
        }
    };

    return (
        <div className="mt-3 pt-3 border-t border-border/50">
            <div className="grid grid-cols-2 gap-3">
                {/* Component Checks */}
                {data.componentChecks && (
                    <div className="col-span-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Component Status:</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(data.componentChecks).map(([key, value]: [string, any]) => {
                                const comp = componentIcons[key];
                                if (!comp) return null;
                                return (
                                    <div key={key} className="flex items-center gap-1 bg-background rounded px-2 py-1">
                                        <comp.icon className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs">{comp.label}:</span>
                                        {getStatusBadge(value)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Score Grid */}
                <div className="col-span-2 grid grid-cols-4 gap-2">
                    {data.batteryHealth && (
                        <div className="bg-background rounded p-2 text-center">
                            <p className="text-xs text-muted-foreground">Battery</p>
                            <p className={cn("font-bold", data.batteryHealth >= 80 ? "text-emerald-500" : data.batteryHealth >= 50 ? "text-yellow-500" : "text-red-500")}>
                                {data.batteryHealth}%
                            </p>
                        </div>
                    )}
                    {data.screenScore && (
                        <div className="bg-background rounded p-2 text-center">
                            <p className="text-xs text-muted-foreground">Screen</p>
                            <p className="font-bold">{data.screenScore}%</p>
                        </div>
                    )}
                    {data.keyboardScore && (
                        <div className="bg-background rounded p-2 text-center">
                            <p className="text-xs text-muted-foreground">Keyboard</p>
                            <p className="font-bold">{data.keyboardScore}%</p>
                        </div>
                    )}
                    {data.wifiScore && (
                        <div className="bg-background rounded p-2 text-center">
                            <p className="text-xs text-muted-foreground">WiFi</p>
                            <p className="font-bold">{data.wifiScore}%</p>
                        </div>
                    )}
                </div>

                {data.maxSellingPrice && (
                    <div className="col-span-2 flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30 rounded p-2">
                        <span className="text-xs font-medium">Max Selling Price:</span>
                        <span className="font-bold text-emerald-600">
                            Rp {data.maxSellingPrice.toLocaleString('id-ID')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Refurbish Details Component
function RefurbishDetails({ data }: { data: any }) {
    return (
        <div className="mt-3 pt-3 border-t border-border/50">
            <div className="grid grid-cols-2 gap-3">
                {data.componentReplaced && (
                    <div>
                        <p className="text-xs text-muted-foreground">Component</p>
                        <p className="font-medium">{data.componentReplaced}</p>
                    </div>
                )}

                {(data.oldSpec || data.newSpec) && (
                    <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Upgrade</p>
                        <div className="flex items-center gap-2">
                            {data.oldSpec && <Badge variant="outline">{data.oldSpec}</Badge>}
                            <span className="text-muted-foreground">→</span>
                            {data.newSpec && <Badge className="bg-blue-500">{data.newSpec}</Badge>}
                        </div>
                    </div>
                )}

                {data.cost > 0 && (
                    <div className="col-span-2 flex justify-between items-center bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                        <span className="text-xs font-medium">Biaya:</span>
                        <span className="font-bold text-blue-600">
                            Rp {data.cost.toLocaleString('id-ID')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Warranty Details Component
function WarrantyDetails({ data }: { data: any }) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SUBMITTED':
                return <Badge className="bg-yellow-500">Submitted</Badge>;
            case 'INSPECTING':
                return <Badge className="bg-blue-500">Inspecting</Badge>;
            case 'REPAIRING':
                return <Badge className="bg-orange-500">Repairing</Badge>;
            case 'COMPLETED':
                return <Badge className="bg-emerald-500">Completed</Badge>;
            case 'REJECTED':
                return <Badge className="bg-red-500">Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status:</span>
                {getStatusBadge(data.status)}
            </div>

            {data.issueDescription && (
                <div>
                    <p className="text-xs text-muted-foreground">Keluhan:</p>
                    <p className="text-sm">{data.issueDescription}</p>
                </div>
            )}

            {data.resolutionNotes && (
                <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                    <p className="text-xs text-muted-foreground">Solusi:</p>
                    <p className="text-sm font-medium text-emerald-600">{data.resolutionNotes}</p>
                </div>
            )}

            {data.customer && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Pelanggan:</span>
                    <span className="font-medium">{data.customer.name}</span>
                </div>
            )}
        </div>
    );
}

// Sale Details Component
function SaleDetails({ data }: { data: any }) {
    const isWarrantyActive = data.warrantyEndDate && new Date(data.warrantyEndDate) > new Date();

    return (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            {data.invoiceNumber && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Invoice:</span>
                    <span className="font-medium text-blue-600">{data.invoiceNumber}</span>
                </div>
            )}

            {data.totalAmount && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-purple-600">
                        Rp {data.totalAmount.toLocaleString('id-ID')}
                    </span>
                </div>
            )}

            {data.customer && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Pelanggan:</span>
                    <span className="font-medium">{data.customer.name}</span>
                </div>
            )}

            {data.warrantyEndDate && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Garansi:</span>
                    <div className="flex items-center gap-1">
                        {isWarrantyActive ? (
                            <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span className="text-emerald-600">
                                    Aktif - {new Date(data.warrantyEndDate).toLocaleDateString('id-ID')}
                                </span>
                            </>
                        ) : (
                            <>
                                <XCircle className="h-3 w-3 text-red-500" />
                                <span className="text-red-500">Expired</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {data.passportStatus && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status Unit:</span>
                    <Badge variant="outline">{data.passportStatus}</Badge>
                </div>
            )}
        </div>
    );
}
