import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModernSelect } from "@/components/ui/modern-select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, HelpCircle, Battery, Monitor, Keyboard, Usb, Wifi, Globe, Fingerprint, Mic, Speaker, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QCDetailFormProps {
    // Score states (0-100)
    screenScore: number;
    setScreenScore: (v: number) => void;
    batteryHealth: number;
    setBatteryHealth: (v: number) => void;
    keyboardScore: number;
    setKeyboardScore: (v: number) => void;
    usbPortsScore: number;
    setUsbPortsScore: (v: number) => void;
    hingeScore: number;
    setHingeScore: (v: number) => void;
    wifiScore: number;
    setWifiScore: (v: number) => void;
    bodyScore: number;
    setBodyScore: (v: number) => void;
    batteryCycle: number;
    setBatteryCycle: (v: number) => void;

    // Status states (PASS/FAIL/NOT_TESTED)
    touchpadStatus: string;
    setTouchpadStatus: (v: string) => void;
    speakerStatus: string;
    setSpeakerStatus: (v: string) => void;
    micStatus: string;
    setMicStatus: (v: string) => void;
    bluetoothStatus: string;
    setBluetoothStatus: (v: string) => void;
    webcamStatus: string;
    setWebcamStatus: (v: string) => void;
    hdmiStatus: string;
    setHdmiStatus: (v: string) => void;
    chargingStatus: string;
    setChargingStatus: (v: string) => void;
    fingerprintStatus: string;
    setFingerprintStatus: (v: string) => void;
}

export function QCDetailForm({
    screenScore, setScreenScore,
    batteryHealth, setBatteryHealth,
    keyboardScore, setKeyboardScore,
    usbPortsScore, setUsbPortsScore,
    hingeScore, setHingeScore,
    wifiScore, setWifiScore,
    bodyScore, setBodyScore,
    batteryCycle, setBatteryCycle,
    touchpadStatus, setTouchpadStatus,
    speakerStatus, setSpeakerStatus,
    micStatus, setMicStatus,
    bluetoothStatus, setBluetoothStatus,
    webcamStatus, setWebcamStatus,
    hdmiStatus, setHdmiStatus,
    chargingStatus, setChargingStatus,
    fingerprintStatus, setFingerprintStatus,
}: QCDetailFormProps) {

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PASS': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'FAIL': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <HelpCircle className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PASS': return 'bg-emerald-100 border-emerald-300 text-emerald-700';
            case 'FAIL': return 'bg-red-100 border-red-300 text-red-700';
            default: return 'bg-gray-100 border-gray-300 text-gray-500';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const StatusButton = ({
        label,
        status,
        setStatus,
        icon: Icon
    }: {
        label: string;
        status: string;
        setStatus: (v: string) => void;
        icon: any;
    }) => (
        <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium flex-1">{label}</span>
            <div className="flex gap-1">
                <button
                    type="button"
                    onClick={() => setStatus('PASS')}
                    className={cn(
                        "p-1 rounded transition-colors",
                        status === 'PASS'
                            ? "bg-emerald-500 text-white"
                            : "bg-white dark:bg-gray-800 hover:bg-emerald-100"
                    )}
                    title="PASS"
                >
                    <CheckCircle2 className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => setStatus('FAIL')}
                    className={cn(
                        "p-1 rounded transition-colors",
                        status === 'FAIL'
                            ? "bg-red-500 text-white"
                            : "bg-white dark:bg-gray-800 hover:bg-red-100"
                    )}
                    title="FAIL"
                >
                    <XCircle className="h-4 w-4" />
                </button>
            </div>
        </div>
    );

    const ScoreSlider = ({
        label,
        value,
        setValue,
        icon: Icon
    }: {
        label: string;
        value: number;
        setValue: (v: number) => void;
        icon: any;
    }) => (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">{label}</span>
                </div>
                <Badge variant={value >= 90 ? "default" : value >= 60 ? "secondary" : "destructive"}>
                    <span className={getScoreColor(value)}>{value}%</span>
                </Badge>
            </div>
            <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setValue(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Component Scores */}
            <Card className="border-primary/20">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Skor Komponen (0-100)
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Geser slider untuk setiap komponen
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ScoreSlider label="Layar / Screen" value={screenScore} setValue={setScreenScore} icon={Monitor} />
                    <ScoreSlider label="Keyboard" value={keyboardScore} setValue={setKeyboardScore} icon={Keyboard} />
                    <ScoreSlider label="USB Ports" value={usbPortsScore} setValue={setUsbPortsScore} icon={Usb} />
                    <ScoreSlider label="Engsel / Hinge" value={hingeScore} setValue={setHingeScore} icon={Globe} />
                    <ScoreSlider label="WiFi" value={wifiScore} setValue={setWifiScore} icon={Wifi} />
                    <ScoreSlider label="Body / Fisik" value={bodyScore} setValue={setBodyScore} icon={Globe} />
                </CardContent>
            </Card>

            {/* Battery Section */}
            <Card className="border-blue-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Battery className="h-4 w-4" />
                        Baterai
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ScoreSlider label="Kesehatan Baterai (%)" value={batteryHealth} setValue={setBatteryHealth} icon={Battery} />
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Cycle Count</span>
                            <Input
                                type="number"
                                min="0"
                                value={batteryCycle}
                                onChange={(e) => setBatteryCycle(parseInt(e.target.value) || 0)}
                                className="w-24 h-8 text-center"
                                placeholder="0"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Cycle count bisa dicek via command: powercfg /batteryreport
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Component Status Checks */}
            <Card className="border-green-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Cek Komponen (PASS/FAIL)
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Klik untuk menandai status setiap komponen
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                        <StatusButton label="Touchpad" status={touchpadStatus} setStatus={setTouchpadStatus} icon={Fingerprint} />
                        <StatusButton label="Speaker" status={speakerStatus} setStatus={setSpeakerStatus} icon={Volume2} />
                        <StatusButton label="Microphone" status={micStatus} setStatus={setMicStatus} icon={Mic} />
                        <StatusButton label="Bluetooth" status={bluetoothStatus} setStatus={setBluetoothStatus} icon={Wifi} />
                        <StatusButton label="Webcam" status={webcamStatus} setStatus={setWebcamStatus} icon={Monitor} />
                        <StatusButton label="HDMI/VGA" status={hdmiStatus} setStatus={setHdmiStatus} icon={Globe} />
                        <StatusButton label="Charging" status={chargingStatus} setStatus={setChargingStatus} icon={Battery} />
                        <StatusButton label="Fingerprint" status={fingerprintStatus} setStatus={setFingerprintStatus} icon={Fingerprint} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Helper function to calculate grade based on scores
export function calculateQCGrade(scores: {
    screenScore: number;
    batteryHealth: number;
    keyboardScore: number;
    usbPortsScore: number;
    hingeScore: number;
    wifiScore: number;
    bodyScore: number;
}): 'A' | 'B' | 'C' | 'REJECT' {
    const all = [
        scores.screenScore,
        scores.batteryHealth,
        scores.keyboardScore,
        scores.usbPortsScore,
        scores.hingeScore,
        scores.wifiScore,
        scores.bodyScore,
    ];

    const min = Math.min(...all);
    const avg = all.reduce((a, b) => a + b, 0) / all.length;

    if (min === 0) return 'REJECT';
    if (min >= 90 && scores.bodyScore >= 90) return 'A';
    if (min >= 60 && avg >= 75) return 'B';
    return 'C';
}

// Helper to get max selling price based on grade
export function getQCMaxPrice(grade: string, costPrice: number): number {
    switch (grade) {
        case 'A': return costPrice * 1.40;
        case 'B': return costPrice * 1.25;
        case 'C': return costPrice * 1.10;
        case 'REJECT': return costPrice * 0.50;
        default: return costPrice;
    }
}

// Helper to get warranty days based on grade
export function getQCWarrantyDays(grade: string): number {
    switch (grade) {
        case 'A': return 90;
        case 'B': return 30;
        case 'C': return 7;
        case 'REJECT': return 0;
        default: return 0;
    }
}
