import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { toast } from 'sonner';

interface CameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function CameraScanner({ onScanSuccess, onClose }: CameraScannerProps) {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let activeScanner: Html5QrcodeScanner | null = null;

    // We add a small delay to ensure the DOM element is fully mounted
    // and ready before html5-qrcode tries to attach to it.
    const timer = setTimeout(() => {
      setIsInitializing(false);
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: {width: 250, height: 150},
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        },
        /* verbose= */ false
      );
  
      activeScanner = scanner;

      scanner.render(
        (decodedText) => {
          // Play a small beep sound if possible
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // value in hertz
            oscillator.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
          } catch (e) {}

          scanner.clear();
          onScanSuccess(decodedText);
        },
        (_error) => {
          // Typically ignore errors as they are frequent when scanning
        }
      );
    }, 100);

    return () => {
      clearTimeout(timer);
      if (activeScanner) {
        activeScanner.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner on unmount. ", error);
        });
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[100] bg-background/90 flex flex-col items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
          <h3 className="font-bold text-sm">Scan Barcode / QR</h3>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
          >
            Tutup
          </button>
        </div>
        
        <div className="p-4 bg-black/5 min-h-[300px] flex items-center justify-center relative">
          <div id="reader" className="w-full h-full [&_video]:rounded-lg [&_video]:object-cover" />
          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <div className="text-sm font-medium text-foreground animate-pulse">Menyiapkan Kamera...</div>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-muted/30 text-xs text-center text-muted-foreground">
          Arahkan kamera ke barcode pada barang Anda. Pastikan pencahayaan cukup.
        </div>
      </div>
    </div>
  );
}
