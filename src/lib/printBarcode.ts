export interface StoreProfile {
    name: string;
    address: string;
    phone: string;
    logo?: string;
    footer?: string;
}

export interface BatchPrintItem {
    id: string;
    itemName: string;
    barcode: string;
    sellingPrice: number;
    specs?: string;
    category: string;
    quantityToPrint: number;
}

export interface BatchPrintConfig {
    layoutSize: "58mm" | "80mm";
    format: "barcode" | "qrcode";
    showSpecs: boolean;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const escapeHtml = (str: any): string => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

export const printBarcodeSticker = (item: any, store: StoreProfile) => {
    // Create a unique iframe ID
    const iframeId = `print-iframe-${Date.now()}`;
    
    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
        alert("Gagal memproses cetak. Browser tidak mendukung.");
        return;
    }

    const itemName = item.itemName || item.name || '';
    const itemBarcode = item.barcode || '';
    const itemPrice = item.sellingPrice || item.sellPrice || item.price || 0;
    const storeName = store.name || localStorage.getItem('storeName') || 'Toko Anda';

    // Set up message listener in parent to clean up the iframe
    const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'CLOSE_PRINT_IFRAME' && event.data.id === iframeId) {
            document.body.removeChild(iframe);
            window.removeEventListener('message', handleMessage);
        }
    };
    window.addEventListener('message', handleMessage);

    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Print Barcode - ${escapeHtml(itemName)}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
            @page {
                margin: 0;
                size: 58mm 40mm;
            }
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 4px 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                text-align: center;
                width: 58mm;
                height: 40mm;
                background: white;
            }
            .store-name {
                font-size: 9px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #000;
                width: 100%;
                padding-bottom: 1px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .item-name {
                font-size: 9px;
                font-weight: 800;
                line-height: 1.1;
                margin-top: 2px;
                width: 100%;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                word-wrap: break-word;
            }
            .barcode-container {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                flex: 1;
                min-height: 0;
                margin: 2px 0;
            }
            .barcode-container svg {
                max-width: 100%;
                max-height: 100%;
            }
            .item-price {
                font-size: 11px;
                font-weight: 950;
                border-top: 1px dashed #000;
                width: 100%;
                padding-top: 1px;
                margin-top: 1px;
            }
        </style>
    </head>
    <body>
        <div class="store-name">${escapeHtml(storeName)}</div>
        <div class="item-name">${escapeHtml(itemName)}</div>
        <div class="barcode-container">
            <svg id="barcode"></svg>
        </div>
        <div class="item-price">${escapeHtml(formatCurrency(itemPrice))}</div>

        <script>
            window.onload = function() {
                try {
                    JsBarcode("#barcode", ${JSON.stringify(itemBarcode)}, {
                        format: "CODE128",
                        width: 1.3,
                        height: 35,
                        displayValue: true,
                        fontSize: 10,
                        margin: 0
                    });
                } catch(e) {
                    document.getElementById('barcode').outerHTML = '<div style="font-size:9px;color:red;">Error: Invalid Barcode</div>';
                }
                
                setTimeout(() => {
                    window.focus();
                    window.print();
                    // Send message to parent to clean up the iframe
                    window.parent.postMessage({ type: 'CLOSE_PRINT_IFRAME', id: ${JSON.stringify(iframeId)} }, '*');
                }, 500);
            }
        </script>
    </body>
    </html>
    `;

    doc.write(html);
    doc.close();
};

export const printBarcodeStickerBatch = (items: BatchPrintItem[], config: BatchPrintConfig, store: StoreProfile) => {
    // Create unique iframe ID
    const iframeId = `print-iframe-${Date.now()}`;
    
    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
        alert("Gagal memproses cetak. Browser tidak mendukung.");
        return;
    }

    const storeName = store.name || localStorage.getItem('storeName') || 'Toko Anda';
    const is58 = config.layoutSize === "58mm";
    const widthCss = is58 ? "58mm" : "80mm";
    const heightCss = is58 ? "40mm" : "50mm";
    const bodyWidth = is58 ? "58mm" : "80mm";

    // Generate flat list of stickers based on quantityToPrint
    const stickerList: { name: string; barcode: string; price: number; specs?: string }[] = [];
    items.forEach(item => {
        for (let i = 0; i < item.quantityToPrint; i++) {
            stickerList.push({
                name: item.itemName,
                barcode: item.barcode,
                price: item.sellingPrice,
                specs: item.specs
            });
        }
    });

    if (stickerList.length === 0) {
        alert("Tidak ada stiker untuk dicetak.");
        document.body.removeChild(iframe);
        return;
    }

    // Set up message listener in parent to clean up the iframe
    const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'CLOSE_PRINT_IFRAME' && event.data.id === iframeId) {
            document.body.removeChild(iframe);
            window.removeEventListener('message', handleMessage);
        }
    };
    window.addEventListener('message', handleMessage);

    let stickerElementsHtml = "";
    stickerList.forEach((st, idx) => {
        const barcodeId = `barcode-${idx}`;
        const qrcodeId = `qrcode-${idx}`;
        const specSummary = config.showSpecs && st.specs 
            ? `<div class="item-specs">${escapeHtml(st.specs)}</div>` 
            : "";

        stickerElementsHtml += `
        <div class="sticker">
            <div class="store-name">${escapeHtml(storeName)}</div>
            <div class="item-name">${escapeHtml(st.name)}</div>
            ${specSummary}
            <div class="code-container">
                ${config.format === "barcode" 
                    ? `<svg id="${barcodeId}"></svg>` 
                    : `<div id="${qrcodeId}" class="qrcode-wrapper"></div>`
                }
            </div>
            <div class="item-price">${escapeHtml(formatCurrency(st.price))}</div>
        </div>
        `;
    });

    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Cetak Label Massal (${stickerList.length} Stiker)</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
        <style>
            @page {
                margin: 0;
                size: ${widthCss} ${heightCss};
            }
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                width: ${bodyWidth};
                background: white;
            }
            .sticker {
                width: ${widthCss};
                height: ${heightCss};
                padding: 4px 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                text-align: center;
                overflow: hidden;
                background: white;
                page-break-inside: avoid;
                break-inside: avoid;
                border-bottom: 1px dashed #ccc;
            }
            @media print {
                .sticker {
                    border-bottom: none;
                }
                .sticker:not(:last-child) {
                    page-break-after: always;
                    break-after: page;
                }
            }
            .store-name {
                font-size: ${is58 ? "9px" : "11px"};
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #000;
                width: 100%;
                padding-bottom: 1px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .item-name {
                font-size: ${is58 ? "9px" : "11px"};
                font-weight: 800;
                line-height: 1.1;
                margin-top: 2px;
                width: 100%;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                word-wrap: break-word;
            }
            .item-specs {
                font-size: ${is58 ? "7px" : "8px"};
                color: #555;
                line-height: 1.1;
                width: 100%;
                white-space: normal;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                word-wrap: break-word;
                margin-top: 1px;
            }
            .code-container {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                flex: 1;
                min-height: 0;
                margin: 2px 0;
            }
            .code-container svg {
                max-width: 100%;
                max-height: 100%;
            }
            .qrcode-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1px;
                background: white;
            }
            .qrcode-wrapper svg {
                width: auto;
                height: ${is58 ? "20mm" : "26mm"};
            }
            .item-price {
                font-size: ${is58 ? "11px" : "13px"};
                font-weight: 900;
                border-top: 1px dashed #000;
                width: 100%;
                padding-top: 1px;
                margin-top: 1px;
            }
        </style>
    </head>
    <body>
        ${stickerElementsHtml}

        <script>
            window.onload = function() {
                var stickers = ${JSON.stringify(stickerList).replace(/</g, '\\u003c')};
                var format = ${JSON.stringify(config.format)};
                var is58 = ${!!is58};

                stickers.forEach(function(st, idx) {
                    var barcodeVal = st.barcode || "00000000";
                    if (format === "barcode") {
                        try {
                            JsBarcode("#barcode-" + idx, barcodeVal, {
                                format: "CODE128",
                                width: is58 ? 1.2 : 1.5,
                                height: is58 ? 30 : 42,
                                displayValue: true,
                                fontSize: is58 ? 9 : 10,
                                margin: 0
                            });
                        } catch(e) {
                            var el = document.getElementById("barcode-" + idx);
                            if (el) el.outerHTML = '<div style="font-size:9px;color:red;">Error Barcode</div>';
                        }
                    } else {
                        try {
                            var qr = qrcode(0, 'M');
                            qr.addData(barcodeVal);
                            qr.make();
                            var cell = is58 ? 2 : 3;
                            document.getElementById("qrcode-" + idx).innerHTML = qr.createSvgTag(cell, 2);
                        } catch(e) {
                            var el = document.getElementById("qrcode-" + idx);
                            if (el) el.innerHTML = '<div style="font-size:9px;color:red;">Error QR</div>';
                        }
                    }
                });
                
                setTimeout(function() {
                    window.focus();
                    window.print();
                    // Send message to parent to clean up
                    window.parent.postMessage({ type: 'CLOSE_PRINT_IFRAME', id: ${JSON.stringify(iframeId)} }, '*');
                }, 500);
            }
        </script>
    </body>
    </html>
    `;

    doc.write(html);
    doc.close();
};
