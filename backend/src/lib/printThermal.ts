import QRCode from 'qrcode';

export interface StoreProfile {
    name: string;
    address: string;
    phone: string;
    logo?: string;
    footer?: string;
    banks?: { bank: string; account: string; name: string }[];
}

export const printThermalReceipt = (transaction: any, store: StoreProfile) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        alert("Gagal membuka jendela cetak. Pastikan pop-up diizinkan.");
        return;
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    };

    const date = new Date(transaction.createdAt).toLocaleString('id-ID', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });

    // Subtotal = revenue (for now assuming no complex tax, just total sum)
    let itemsHtml = '';
    let totalItems = 0;
    
    if (transaction.items && transaction.items.length > 0) {
        itemsHtml = transaction.items.map((item: any) => {
            const qty = item.quantity || item.qty || 1;
            totalItems += qty;
            
            // If the item data has original price and discount details, use them
            const originalPrice = item.price || item.unitPrice || 0;
            const discountValue = item.discountValue || 0;
            const discountType = item.discountType || 'nominal';
            
            const discountPerUnit = discountValue
                ? (discountType === 'percent' ? originalPrice * (discountValue / 100) : discountValue)
                : 0;
            const netUnitPrice = originalPrice - discountPerUnit;
            const totalLine = netUnitPrice * qty;

            const name = item.inventoryItem?.itemName || item.inventoryItem?.item_name || item.itemName || item.item_name || item.name || item.productName || item.product_name || item.description || 'Produk';
            
            let snHtml = '';
            if (item.serialNumbers) {
                let sns = [];
                try {
                    sns = typeof item.serialNumbers === 'string' ? JSON.parse(item.serialNumbers) : item.serialNumbers;
                } catch (e) {}
                if (Array.isArray(sns) && sns.length > 0) {
                    const validSns = sns.filter(Boolean);
                    if (validSns.length > 0) {
                        snHtml = `<div style="font-size: 9px; color: #555; font-style: italic; margin-bottom: 2px;">SN: ${validSns.join(', ')}</div>`;
                    }
                }
            }
            
            let detailsHtml = `<span>${qty} x ${formatCurrency(originalPrice)}</span><span>${formatCurrency(totalLine)}</span>`;
            if (discountPerUnit > 0) {
                const discLabel = discountType === 'percent' ? `${discountValue}%` : formatCurrency(discountPerUnit);
                detailsHtml = `
                    <div style="width: 100%">
                        <div style="display: flex; justify-content: space-between;">
                            <span>${qty} x ${formatCurrency(originalPrice)}</span>
                            <span>${formatCurrency(originalPrice * qty)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #555; font-style: italic;">
                            <span>* Potongan (${discLabel})</span>
                            <span>-${formatCurrency(discountPerUnit * qty)}</span>
                        </div>
                    </div>
                `;
            } else {
                detailsHtml = `<span>${qty} x ${formatCurrency(originalPrice)}</span><span>${formatCurrency(totalLine)}</span>`;
            }

            return `
            <div class="item">
                <div class="item-name">${name}</div>
                ${snHtml}
                <div class="item-details">
                    ${detailsHtml}
                </div>
            </div>
            `;
        }).join('');
    } else {
        itemsHtml = `
            <div class="item">
                <div class="item-name">${transaction.description || 'Pembayaran Transaksi'}</div>
                <div class="item-details">
                    <span>1 x ${formatCurrency(transaction.amount)}</span>
                    <span>${formatCurrency(transaction.amount)}</span>
                </div>
            </div>
        `;
    }

    let paymentMethodText = "TUNAI";
    const pm = (transaction.paymentMethod || '').toLowerCase();
    if (pm === 'bank' || pm === 'transfer bank' || pm === 'transfer') paymentMethodText = "TRANSFER BANK";
    if (pm === 'qris') paymentMethodText = "QRIS";
    if (pm === 'tempo') paymentMethodText = "TEMPO";
    
    const dpText = transaction.dpAmount && transaction.dpAmount > 0 
        ? `<div class="total-row"><span>DP / Dibayar:</span><span>${formatCurrency(transaction.dpAmount)}</span></div>` 
        : '';
        
    const sisa = transaction.paymentStatus === 'Belum Lunas' && transaction.dpAmount > 0 ? (transaction.amount - transaction.dpAmount) : 0;
    const sisaText = sisa > 0
        ? `<div class="total-row"><span>Sisa Tagihan:</span><span>${formatCurrency(sisa)}</span></div>`
        : '';
        
    const discountText = transaction.discountAmount && transaction.discountAmount > 0
        ? `<div class="total-row"><span>Diskon:</span><span>-${formatCurrency(transaction.discountAmount)}</span></div>`
        : '';

    const qrLink = `${window.location.origin}/nota/${transaction.originalId || transaction.id}`;

    // Generate QR Code dynamically
    try {
        const qrCodeLib = QRCode as any;
        const toDataURL = qrCodeLib.toDataURL || qrCodeLib.default?.toDataURL;
        
        if (toDataURL) {
            toDataURL(qrLink, { margin: 1, width: 90, errorCorrectionLevel: 'M' })
                .then((qrDataUrl: string) => {
                    writePrintContent(printWindow, transaction, store, date, itemsHtml, discountText, dpText, sisaText, paymentMethodText, qrDataUrl);
                })
                .catch((err: any) => {
                    console.error("Gagal membuat QR Code secara lokal:", err);
                    writePrintContent(printWindow, transaction, store, date, itemsHtml, discountText, dpText, sisaText, paymentMethodText, '');
                });
        } else {
            console.error("Library QRCode tidak valid:", QRCode);
            writePrintContent(printWindow, transaction, store, date, itemsHtml, discountText, dpText, sisaText, paymentMethodText, '');
        }
    } catch (err) {
        console.error("Terjadi kesalahan sinkron saat membuat QR Code:", err);
        writePrintContent(printWindow, transaction, store, date, itemsHtml, discountText, dpText, sisaText, paymentMethodText, '');
    }
};

const writePrintContent = (
    printWindow: Window,
    transaction: any,
    store: StoreProfile,
    date: string,
    itemsHtml: string,
    discountText: string,
    dpText: string,
    sisaText: string,
    paymentMethodText: string,
    qrDataUrl: string
) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    };

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Struk - ${transaction.id}</title>
            <style>
                @page {
                    margin: 0;
                    size: 58mm auto;
                }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    width: 58mm;
                    margin: 0;
                    padding: 4mm;
                    box-sizing: border-box;
                    color: #000;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .divider {
                    border-top: 1px dashed #000;
                    margin: 5px 0;
                }
                .store-name {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                .store-info {
                    font-size: 10px;
                    margin-bottom: 10px;
                    white-space: pre-wrap;
                }
                .tx-info {
                    font-size: 10px;
                    margin-bottom: 10px;
                }
                .tx-info div {
                    display: flex;
                    justify-content: space-between;
                }
                .items-container {
                    margin-bottom: 10px;
                }
                .item {
                    margin-bottom: 5px;
                    font-size: 11px;
                }
                .item-name {
                    display: block;
                }
                .item-details {
                    display: flex;
                    justify-content: space-between;
                }
                .totals {
                    font-size: 12px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 2px;
                }
                .grand-total {
                    font-weight: bold;
                    font-size: 14px;
                }
                .footer {
                    margin-top: 15px;
                    font-size: 10px;
                    text-align: center;
                }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="text-center">
                ${store.logo ? `<img src="${store.logo}" alt="Logo" style="max-width: 40px; margin-bottom: 5px; filter: grayscale(100%);" />` : ''}
                <div class="store-name">${store.name}</div>
                <div class="store-info">${store.address}<br/>Telp: ${store.phone}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="tx-info">
                <div><span>No:</span> <span>${transaction.invoiceNumber || `INV-${transaction.id.substring(0,8).toUpperCase()}`}</span></div>
                <div><span>Tgl:</span> <span>${date}</span></div>
                <div><span>Kasir:</span> <span>${transaction.creatorName || transaction.userName || transaction.user?.name || transaction.userEmail?.split('@')[0] || 'Kasir'}</span></div>
                <div><span>Pembayaran:</span> <span>${paymentMethodText}</span></div>
            </div>
            
            <div class="divider"></div>
            
            <div class="items-container">
                ${itemsHtml}
            </div>
            
            <div class="divider"></div>
            
            <div class="totals">
                <div class="total-row">
                    <span>Subtotal</span>
                    <span>${formatCurrency(transaction.amount + (transaction.discountAmount || 0))}</span>
                </div>
                ${discountText}
                <div class="total-row grand-total">
                    <span>TOTAL</span>
                    <span>${formatCurrency(transaction.amount)}</span>
                </div>
                ${dpText}
                ${sisaText}
            </div>
            
            ${paymentMethodText === "TRANSFER BANK" && store.banks && store.banks.length > 0 ? `
            <div class="divider"></div>
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 3px;">REKENING TRANSFER:</div>
            ${store.banks.map((b: any) => `
            <div style="font-size: 10px; margin-bottom: 4px; display: flex; flex-direction: column;">
                <span class="font-bold">${b.bank}: ${b.account}</span>
                <span>a/n ${b.name}</span>
            </div>
            `).join('')}
            ` : ''}
            
            ${qrDataUrl ? `
            <div class="divider"></div>
            <div class="text-center" style="margin: 8px 0;">
                <img src="${qrDataUrl}" style="width: 80px; height: 80px;" />
                <div style="font-size: 8px; margin-top: 2px;">PINDAI UNTUK STRUK DIGITAL</div>
            </div>
            ` : ''}
            
            <div class="divider"></div>
            
            <div class="footer">
                ${store.footer ? store.footer.replace(/\n/g, '<br/>') : 'Terima kasih atas kunjungan Anda.<br/>Barang yang sudah dibeli<br/>tidak dapat ditukar/dikembalikan.'}
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
