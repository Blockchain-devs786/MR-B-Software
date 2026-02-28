import { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import OrderReceipt from './OrderReceipt';
import { useToast } from './Toast';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

const PrintPreviewModal = ({ isOpen, onClose, order }: PrintPreviewModalProps) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    if (!isOpen || !order) return null;

    const handlePrint = async () => {
        const printContent = receiptRef.current;
        if (!printContent) return;

        // Fetch settings for print
        let shopName = 'Mr. B';
        let shopAddress = 'Oppo. Kamalpur Interchange,\nSargodha Road.';
        let shopPhone = '03253211234';
        let shopLogo = '';
        let onlinePaymentId = '';
        let receiptRemarks = 'null';

        if (window.api) {
            try {
                const results = await Promise.all([
                    window.api.getSetting('shop_name'),
                    window.api.getSetting('shop_address'),
                    window.api.getSetting('shop_phone'),
                    window.api.getSetting('shop_logo'),
                    window.api.getSetting('online_payment_id'),
                    window.api.getSetting('receipt_remarks')
                ]);

                if (results[0]?.value) shopName = results[0].value;
                if (results[1]?.value) shopAddress = results[1].value;
                if (results[2]?.value) shopPhone = results[2].value;
                if (results[3]?.value) shopLogo = results[3].value;
                if (results[4]?.value) onlinePaymentId = results[4].value;
                if (results[5]?.value) receiptRemarks = results[5].value;
            } catch (error) {
                console.error("Failed to load settings for print:", error);
            }
        }

        const printWindow = window.open('', '_blank', 'width=300,height=600');
        if (!printWindow) {
            showToast('Please allow popups for printing', 'error');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Order #${String(order.id).padStart(5, '0')}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        width: 80mm;
                        padding: 4mm;
                        color: #000;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .font-bold { font-weight: bold; }
                    
                    .border-box {
                        border: 1px solid #000;
                        padding: 2px 0;
                        margin-bottom: 8px;
                        text-align: center;
                    }
                    .border-top-bottom {
                        border-top: 1px dashed #000;
                        border-bottom: 1px dashed #000;
                        margin-bottom: 8px;
                        margin-top: 8px;
                    }
                    .border-top {
                        border-top: 1px solid #000;
                        margin-top: 4px;
                        padding-top: 4px;
                    }
                    .border-bottom {
                        border-bottom: 1px solid #000;
                        margin-bottom: 4px;
                        padding-bottom: 4px;
                    }
                    .flex {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 2px;
                    }
                    .flex-start {
                        display: flex;
                        justify-content: flex-start;
                        gap: 8px;
                        margin-bottom: 2px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 4px;
                        margin-bottom: 4px;
                        border-bottom: 1px dashed #000;
                    }
                    th, td {
                        padding: 4px 0;
                        vertical-align: top;
                    }
                    th {
                        border-top: 1px dashed #000;
                        border-bottom: 1px dashed #000;
                        font-size: 12px;
                        text-align: left;
                    }
                    .header-logo {
                        max-width: 100%;
                        max-height: 80px;
                        object-fit: contain;
                        margin-bottom: 8px;
                        filter: grayscale(100%);
                    }
                    .header-name {
                        font-size: 18px;
                        font-weight: bold;
                        text-align: center;
                        margin-bottom: 2px;
                    }
                    .header-address {
                        font-size: 14px;
                        font-weight: bold;
                        text-align: center;
                        white-space: pre-wrap;
                        margin-bottom: 2px;
                    }
                    .header-contact {
                        font-size: 14px;
                        font-weight: bold;
                        text-align: center;
                        margin-bottom: 8px;
                    }
                    .details-grid {
                        display: grid;
                        grid-template-columns: 120px 1fr;
                        margin-bottom: 2px;
                    }
                    .details-label {
                        text-align: left;
                    }
                    .details-value {
                        text-align: left;
                    }
                    .uppercase {
                        text-transform: uppercase;
                    }
                    .amount-column {
                        text-align: center;
                    }
                    .signature-box {
                        border: 1px solid #000;
                        padding: 4px;
                        margin-top: 16px;
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                    }
                    .watermark-container {
                        position: relative;
                        overflow: hidden;
                    }
                    .watermark {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 64px;
                        font-weight: 900;
                        letter-spacing: 0.1em;
                        text-align: center;
                        pointer-events: none;
                        z-index: 0;
                        opacity: 0.15;
                    }
                    .watermark.paid { color: #22c55e; -webkit-text-stroke: 2px black; }
                    .watermark.unpaid { color: #ef4444; -webkit-text-stroke: 2px black; }
                    .content-container {
                        position: relative;
                        z-index: 10;
                    }
                </style>
            </head>
            <body class="watermark-container">
                <div class="watermark ${order.payment_status === 'Paid' ? 'paid' : 'unpaid'}">
                    ${order.payment_status === 'Paid' ? 'PAID' : 'UNPAID'}
                </div>

                <div class="content-container">
                <div class="text-center">
                    ${shopLogo ? `<img src="${shopLogo}" class="header-logo" alt="Logo" />` : ''}
                    <div class="header-name">${shopName}</div>
                    <div class="header-address">${shopAddress}</div>
                    <div class="header-contact">Contact : ${shopPhone}</div>
                </div>

                <div class="border-box">
                    Customer Bill
                </div>

                <div class="border-box uppercase">
                     ${order.type === 'Dine-in' ? 'Dine-in' : ''}
                     ${order.type === 'Takeaway' ? 'Takeaway' : ''}
                     ${order.type === 'Delivery' ? 'Delivery' : ''}
                </div>

                <div class="details-grid">
                    <span class="details-label">Order No :</span>
                    <span class="details-value">${String(order.id).padStart(5, '0')}</span>
                </div>
                <div class="details-grid">
                    <span class="details-label">Date & Time :</span>
                    <span class="details-value">${new Date(order.created_at).toLocaleString('en-PK', {
            year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
        })}</span>
                </div>
                <div class="details-grid">
                    <span class="details-label">Waiter :</span>
                    <span class="details-value uppercase">${order.waiter_name || 'N/A'}</span>
                </div>
                <div class="details-grid">
                    <span class="details-label">User :</span>
                    <span class="details-value uppercase">ADMIN</span>
                </div>
                <div class="details-grid">
                    <span class="details-label">Customer Name :</span>
                    <span class="details-value uppercase">${order.customer_name || 'N/A'}</span>
                </div>
                ${order.type === 'Delivery' ? `
                    <div class="details-grid">
                        <span class="details-label">Customer Address :</span>
                        <span class="details-value uppercase">${order.delivery_address || 'N/A'}</span>
                    </div>
                ` : ''}
                <div class="details-grid">
                    <span class="details-label">Customer Number :</span>
                    <span class="details-value">${order.customer_phone || 'N/A'}</span>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40%">DESCRIPTION</th>
                            <th class="text-center" style="width: 15%">QTY</th>
                            <th class="text-center" style="width: 20%">RATE</th>
                            <th class="text-center" style="width: 25%">AMOUNTPKR<br>(S)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(order.items || []).map((item: any) => `
                            <tr>
                                <td>${item.item_name}</td>
                                <td class="text-center font-bold">
                                    ${Number(item.quantity).toFixed(2)}<br>
                                    <span style="font-weight:normal; font-size: 10px;">ps</span>
                                </td>
                                <td class="text-center">${Number(item.unit_price).toFixed(2)}</td>
                                <td class="text-center">${Number(item.line_total).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="flex" style="margin-top: 8px;">
                    <div style="width: 50%">No Of Items: ${order.items?.length || 0}</div>
                    <div style="width: 50%">
                        <div class="flex">
                            <span class="details-label">Total Qty: ${order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
                            <span>${Number(order.subtotal).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div style="margin-left: 30%; margin-top: 16px;">
                    ${Number(order.discount) > 0 ? `
                        <div class="flex border-bottom">
                            <span>Discount :</span>
                            <span>-${Number(order.discount).toFixed(2)}</span>
                        </div>
                    ` : ''}
                    ${Number(order.delivery_charges) > 0 ? `
                        <div class="flex border-bottom">
                            <span>Delivery Charges :</span>
                            <span>${Number(order.delivery_charges).toFixed(2)}</span>
                        </div>
                    ` : ''}
                    ${Number(order.service_charges) > 0 ? `
                        <div class="flex border-bottom">
                            <span>Service Charges :</span>
                            <span>${Number(order.service_charges).toFixed(2)}</span>
                        </div>
                    ` : ''}
                    ${Number(order.gst) > 0 ? `
                        <div class="flex border-bottom">
                            <span>GST :</span>
                            <span>${Number(order.gst).toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="flex border-bottom font-bold" style="font-size: 16px;">
                        <span>Total :</span>
                        <span>${Number(order.total).toFixed(2)}</span>
                    </div>
                </div>
                ${(order.payment_status === 'Paid' && order.payments && order.payments.length > 0) ? `
                    <div style="margin-top: 8px; margin-bottom: 8px; font-size: 11px; border: 1px dashed #999; padding: 4px;">
                        <div class="font-bold border-bottom" style="margin-bottom: 4px; border-bottom: 1px dashed #ccc;">Payment Received:</div>
                        ${order.payments.map((p: any) => `
                            <div class="flex">
                                <span>${p.payment_type}</span>
                                <span>${Number(p.amount).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div style="margin-top: 32px">
                    ${onlinePaymentId ? `
                        <div>For Online Payment. Raast ID</div>
                        <div>(${onlinePaymentId})</div>
                    ` : ''}
                    <div>Thank you.</div>
                    <div>Remarks: ${receiptRemarks}</div>
                </div>

                <div class="flex border-box" style="margin-top: 16px; font-size: 11px; padding: 4px;">
                    <span>Print Date: ${new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                    <span>Print Time: ${new Date().toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                </div>
                </div> <!-- End container -->
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold">Print Preview</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Receipt Preview */}
                <div className="p-4 bg-gray-100 max-h-[60vh] overflow-auto">
                    <div className="mx-auto shadow-lg">
                        <OrderReceipt ref={receiptRef} order={order} />
                    </div>
                </div>

                {/* Footer with Print Button */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handlePrint}
                        className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 flex items-center justify-center gap-2"
                    >
                        <Printer size={20} />
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintPreviewModal;
