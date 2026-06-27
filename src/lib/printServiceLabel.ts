import QRCode from 'qrcode';

export interface StoreProfile {
    name: string;
    address: string;
    phone: string;
    logo?: string;
    footer?: string;
}

export const printServiceLabel = (service: any, store: StoreProfile) => {
    // Open print window synchronously to prevent browser popup blockers
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        alert("Gagal membuka jendela cetak. Pastikan pop-up diizinkan.");
        return;
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    };

    const date = new Date(service.receivedDate || service.createdAt || new Date()).toLocaleString('id-ID', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });

    const qrLink = `${window.location.origin}/nota-servis/${service.id}`;

    const costText = service.status === 'Selesai' || service.status === 'Diambil'
        ? formatCurrency(service.finalCost)
        : formatCurrency(service.estimatedCost);

    // Handle potential Vite ESM/CommonJS import issues safely
    try {
        // QRCode might be a default export object or have named exports depending on the bundler
        const qrCodeLib = QRCode as any;
        const toDataURL = qrCodeLib.toDataURL || qrCodeLib.default?.toDataURL;
        
        if (toDataURL) {
            toDataURL(qrLink, { margin: 1, width: 110, errorCorrectionLevel: 'H' })
                .then((qrDataUrl: string) => {
                    writePrintContent(printWindow, service, store, date, costText, qrDataUrl);
                })
                .catch((err: any) => {
                    console.error("Gagal membuat QR Code secara lokal:", err);
                    writePrintContent(printWindow, service, store, date, costText, '');
                });
        } else {
            console.error("Library QRCode tidak valid:", QRCode);
            writePrintContent(printWindow, service, store, date, costText, '');
        }
    } catch (err) {
        console.error("Terjadi kesalahan sinkron saat membuat QR Code:", err);
        writePrintContent(printWindow, service, store, date, costText, '');
    }
};

const writePrintContent = (
    printWindow: Window,
    service: any,
    store: StoreProfile,
    date: string,
    costText: string,
    qrDataUrl: string
) => {
    const rawNotes = service.notes || "";
    
    // Clean metadata blocks unconditionally to prevent raw JSON leak in all cases
    let cleanNotes = rawNotes
        .replace(/\n?\[QC:\s*\{[\s\S]*?\}\]/g, "")
        .replace(/\n?\[Kelengkapan:\s*\{[\s\S]*?\}\]/g, "")
        .replace(/\n?\[Spareparts:\s*\[[\s\S]*?\]\]/g, "")
        .replace(/\n?\[Spareparts:\s*[\s\S]*?\]\]/g, "") // fallback
        .trim();

    let qcText = "";
    let kelengkapanText = "";
    let sparepartsText = "";

    // Parse QC for print display
    const qcMatch = rawNotes.match(/\[QC:\s*(\{[\s\S]*?\})\]/);
    if (qcMatch) {
        try {
            const qcData = JSON.parse(qcMatch[1]);
            const keys = Object.keys(qcData);
            const passed = keys.filter(k => qcData[k] === true).length;
            const total = keys.length;
            if (total > 0) {
                qcText = `${passed}/${total} Lolos`;
            }
        } catch (e) {
            console.error("Failed to parse QC JSON", e);
        }
    }

    // Parse Kelengkapan for print display
    const kelengkapanMatch = rawNotes.match(/\[Kelengkapan:\s*(\{[\s\S]*?\})\]/);
    if (kelengkapanMatch) {
        try {
            const kelengkapanData = JSON.parse(kelengkapanMatch[1]);
            const items = [];
            if (kelengkapanData.charger) items.push("Charger");
            if (kelengkapanData.tas) items.push("Tas");
            if (kelengkapanData.dus) items.push("Dus");
            if (kelengkapanData.lainnya) items.push(kelengkapanData.lainnya);
            if (items.length > 0) {
                kelengkapanText = items.join(", ");
            }
        } catch (e) {
            console.error("Failed to parse Kelengkapan JSON", e);
        }
    }

    // Parse Spareparts for print display
    const partsMatch = rawNotes.match(/\[Spareparts:\s*(\[[\s\S]*?\])\]/);
    if (partsMatch) {
        try {
            const sparepartsData = JSON.parse(partsMatch[1]);
            if (Array.isArray(sparepartsData) && sparepartsData.length > 0) {
                sparepartsText = sparepartsData.map((p: any) => `${p.name} (x${p.qty})`).join(", ");
            }
        } catch (e) {
            console.error("Failed to parse spareparts JSON", e);
        }
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Label Servis - ${service.id.substring(0,8).toUpperCase()}</title>
            <style>
                @page {
                    margin: 0;
                    size: 58mm auto;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    font-size: 9.5px;
                    width: 58mm;
                    margin: 0;
                    padding: 2mm 3mm;
                    box-sizing: border-box;
                    color: #000;
                    line-height: 1.3;
                }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
                .divider {
                    border-top: 1px dashed #000;
                    margin: 5px 0;
                }
                .title {
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    margin-bottom: 1px;
                    text-transform: uppercase;
                }
                .store-name {
                    font-size: 9px;
                    font-weight: 600;
                    color: #555;
                    margin-bottom: 2px;
                }
                .info-row {
                    margin-bottom: 3px;
                    display: flex;
                    align-items: flex-start;
                }
                .info-label {
                    font-weight: 600;
                    width: 70px;
                    flex-shrink: 0;
                    color: #444;
                }
                .info-colon {
                    width: 8px;
                    flex-shrink: 0;
                    color: #444;
                }
                .info-value {
                    flex: 1;
                    word-break: break-word;
                    color: #000;
                }
                .qr-container {
                    margin: 8px 0;
                }
                .footer {
                    font-size: 8px;
                    text-align: center;
                    margin-top: 5px;
                    letter-spacing: 0.5px;
                }
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="title">LABEL UNIT SERVIS</div>
                <div class="store-name">${store.name || 'HanLaptop'}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="info-row">
                <div class="info-label">No. Servis</div>
                <div class="info-colon">:</div>
                <div class="info-value font-bold font-mono">SRV-${service.id.substring(0, 8).toUpperCase()}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Tgl Masuk</div>
                <div class="info-colon">:</div>
                <div class="info-value font-mono">${date}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Pelanggan</div>
                <div class="info-colon">:</div>
                <div class="info-value font-bold">${service.customerName}</div>
            </div>
            ${service.customerPhone ? `
            <div class="info-row">
                <div class="info-label">No. WA</div>
                <div class="info-colon">:</div>
                <div class="info-value font-mono">${service.customerPhone}</div>
            </div>` : ''}
            <div class="info-row">
                <div class="info-label">Unit</div>
                <div class="info-colon">:</div>
                <div class="info-value font-bold">${service.deviceName}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Keluhan</div>
                <div class="info-colon">:</div>
                <div class="info-value">${service.issue}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Biaya</div>
                <div class="info-colon">:</div>
                <div class="info-value font-mono font-bold">${costText}</div>
            </div>
            ${cleanNotes ? `
            <div class="info-row">
                <div class="info-label">Catatan</div>
                <div class="info-colon">:</div>
                <div class="info-value">${cleanNotes}</div>
            </div>` : ''}
            ${kelengkapanText ? `
            <div class="info-row">
                <div class="info-label">Kelengkapan</div>
                <div class="info-colon">:</div>
                <div class="info-value">${kelengkapanText}</div>
            </div>` : ''}
            ${sparepartsText ? `
            <div class="info-row">
                <div class="info-label">Spareparts</div>
                <div class="info-colon">:</div>
                <div class="info-value">${sparepartsText}</div>
            </div>` : ''}
            ${qcText ? `
            <div class="info-row">
                <div class="info-label">QC Status</div>
                <div class="info-colon">:</div>
                <div class="info-value font-bold">${qcText}</div>
            </div>` : ''}
            
            <div class="divider"></div>
            
            <div class="text-center qr-container">
                ${qrDataUrl 
                    ? `<img src="${qrDataUrl}" style="width: 90px; height: 90px;" />` 
                    : `<div style="width: 90px; height: 90px; border: 1px dashed #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 8px; color: red;">Gagal membuat QR Code</div>`
                }
                <div style="font-size: 8px; margin-top: 3px;">PINDAI UNTUK CEK STATUS</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="footer font-bold">
                TEMPELKAN PADA UNIT LAPTOP
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

