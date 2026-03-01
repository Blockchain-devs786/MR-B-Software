import { useRef } from 'react';
import { X, Printer } from 'lucide-react';

interface RegistryPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportData: any;
}

const RegistryPrintModal = ({ isOpen, onClose, reportData }: RegistryPrintModalProps) => {
    const printRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !reportData) return null;

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Registry Report #${reportData.registry?.id || 'N/A'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: black;
            width: 80mm;
            padding: 4mm;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .border-dashed {
            border-bottom: 1px dashed #999;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        .flex {
            display: flex;
            justify-content: space-between;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
        }
        th, td {
            padding: 2px 0;
            font-size: 11px;
        }
        th {
            border-bottom: 1px solid #ccc;
            font-weight: bold;
        }
        .header {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 4px;
        }
        .subheader {
            font-size: 10px;
            text-align: center;
        }
        .section-title {
            font-weight: bold;
            margin-top: 8px;
            margin-bottom: 4px;
        }
        .total-row {
            font-weight: bold;
            font-size: 13px;
            margin-top: 4px;
            border-top: 1px solid #000;
            padding-top: 4px;
        }
        .gross-sale {
            font-weight: bold;
            font-size: 16px;
            margin-top: 8px;
            border-top: 3px solid #000;
            padding-top: 8px;
        }
        .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 8px;
        }
        @media print {
            body {
                width: 80mm;
            }
        }
    </style>
</head>
<body>
    <div class="header">Mr B</div>
    <div class="subheader border-dashed">REGISTRY SUMMARY REPORT</div>
    
    ${reportData.registry ? `
    <div class="border-dashed">
        <div class="section-title">Registry Time:</div>
        <div class="flex"><span>Start:</span><span>${new Date(reportData.registry.start_time).toLocaleString('en-PK')}</span></div>
        <div class="flex"><span>End:</span><span>${reportData.registry.end_time ? new Date(reportData.registry.end_time).toLocaleString('en-PK') : 'Still Open'}</span></div>
    </div>
    ` : ''}

    <div class="border-dashed">
        <div class="section-title">Sale Summary:</div>
        <table>
            <thead>
                <tr>
                    <th class="text-left">Type</th>
                    <th class="text-right">Count</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(reportData.saleSummary).map(([type, data]: [string, any]) => `
                    <tr>
                        <td>${type}</td>
                        <td class="text-right">${data.count}</td>
                        <td class="text-right">Rs.${data.amount.toFixed(0)}</td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td>Total Sale</td>
                    <td class="text-right">${reportData.totalOrders}</td>
                    <td class="text-right">Rs.${reportData.totalSales.toFixed(0)}</td>
                </tr>
            </tbody>
        </table>
    </div>

    ${reportData.registry ? `
    <div class="border-dashed">
        <div class="section-title">Cash in Hand:</div>
        <div class="flex"><span>Opening Cash:</span><span>Rs.${Number(reportData.registry.opening_cash).toFixed(0)}</span></div>
        <div class="flex"><span>Closing Cash:</span><span>Rs.${Number(reportData.registry.closing_cash).toFixed(0)}</span></div>
        <div class="flex"><span>Expenses:</span><span>-Rs.${reportData.totalExpenses.toFixed(0)}</span></div>
        <div class="flex total-row"><span>Closing Cash After Expense:</span><span>Rs.${Number(reportData.registry.closing_cash_after_expense).toFixed(0)}</span></div>
    </div>
    ` : ''}

    <div class="border-dashed">
        <div class="section-title">Order Type:</div>
        <table>
            <thead>
                <tr>
                    <th class="text-left">Order Type</th>
                    <th class="text-right">Count</th>
                    <th class="text-right">Avg Amount</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(reportData.orderTypeSummary).map(([type, data]: [string, any]) => {
            const totalOrders = reportData.totalOrders;
            const percentage = totalOrders > 0 ? ((data.count / totalOrders) * 100).toFixed(1) : '0.0';
            return `
                        <tr>
                            <td>${type}</td>
                            <td class="text-right">${data.count}</td>
                            <td class="text-right">Rs.${data.avgAmount.toFixed(0)}</td>
                            <td class="text-right">Rs.${data.amount.toFixed(0)} (${percentage}%)</td>
                        </tr>
                    `;
        }).join('')}
            </tbody>
        </table>
    </div>

    <div class="border-dashed">
        <div class="section-title">Payment Mode Summary:</div>
        <table>
            <thead>
                <tr>
                    <th class="text-left">Mode</th>
                    <th class="text-right">Count</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(reportData.paymentModeSummary).map(([mode, data]: [string, any]) => `
                    <tr>
                        <td>${mode}</td>
                        <td class="text-right">${data.count}</td>
                        <td class="text-right">Rs.${data.amount.toFixed(0)}</td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td>Total</td>
                    <td class="text-right">${reportData.totalOrders}</td>
                    <td class="text-right">Rs.${reportData.totalSales.toFixed(0)}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="border-dashed">
        <div class="section-title">Cancelled:</div>
        <div class="flex"><span>No. of orders:</span><span>${reportData.cancelledOrders}</span></div>
        <div class="flex"><span>Amount:</span><span>Rs.${reportData.cancelledAmount.toFixed(0)}</span></div>
    </div>

    <div class="border-dashed">
        <div class="section-title">Refunds (deducted from gross):</div>
        <div class="flex"><span>No. of refunds:</span><span>${reportData.refundCount ?? 0}</span></div>
        <div class="flex"><span>Amount:</span><span>Rs.${(reportData.totalRefunds ?? 0).toFixed(0)}</span></div>
    </div>

    <div class="border-dashed">
        <div class="section-title">Gross Sale / MOP:</div>
        <div class="flex"><span>Discount:</span><span>-Rs.${reportData.totalDiscount.toFixed(0)}</span></div>
        <div class="flex"><span>Sale (After Discount):</span><span>Rs.${reportData.saleAfterDiscount.toFixed(0)}</span></div>
        <div class="flex"><span>Cash GST:</span><span>Rs.${reportData.totalGST.toFixed(0)}</span></div>
        <div class="flex"><span>Net Amount:</span><span>Rs.${reportData.netAmount.toFixed(0)}</span></div>
        <div class="flex total-row" style="border-top: 3px solid #000; padding-top: 8px; margin-top: 8px; font-size: 16px; font-weight: bold;">
            <span>GROSS SALE:</span>
            <span>Rs.${(reportData.grossSale || 0).toFixed(0)}</span>
        </div>
    </div>

    <div class="border-dashed">
        <div class="section-title">Pending Orders:</div>
        <div class="flex"><span>No of Orders:</span><span>${reportData.pendingOrders}</span></div>
        <div class="flex"><span>Amount:</span><span>Rs.${reportData.pendingAmount.toFixed(0)}</span></div>
    </div>

    <div class="footer">
        <p>--- End of Report ---</p>
        <p>Generated: ${new Date().toLocaleString('en-PK')}</p>
    </div>
</body>
</html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold">Print Registry Report</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <div ref={printRef} className="bg-white text-black text-[12px]" style={{ width: '80mm', padding: '4mm', fontFamily: 'Arial, sans-serif' }}>
                        {/* Print preview content - same as print template */}
                        <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Mr B</div>
                        <div style={{ textAlign: 'center', fontSize: '10px', borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>REGISTRY SUMMARY REPORT</div>

                        {reportData.registry && (
                            <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                                <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Registry Time:</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Start:</span>
                                    <span>{new Date(reportData.registry.start_time).toLocaleString('en-PK')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>End:</span>
                                    <span>{reportData.registry.end_time ? new Date(reportData.registry.end_time).toLocaleString('en-PK') : 'Still Open'}</span>
                                </div>
                            </div>
                        )}

                        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Sale Summary:</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ccc' }}>
                                        <th style={{ textAlign: 'left', padding: '2px 0' }}>Type</th>
                                        <th style={{ textAlign: 'right', padding: '2px 0' }}>Count</th>
                                        <th style={{ textAlign: 'right', padding: '2px 0' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(reportData.saleSummary).map(([type, data]: [string, any]) => (
                                        <tr key={type}>
                                            <td style={{ padding: '2px 0' }}>{type}</td>
                                            <td style={{ textAlign: 'right', padding: '2px 0' }}>{data.count}</td>
                                            <td style={{ textAlign: 'right', padding: '2px 0' }}>Rs.{data.amount.toFixed(0)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px' }}>
                                        <td style={{ padding: '2px 0' }}>Total Sale</td>
                                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{reportData.totalOrders}</td>
                                        <td style={{ textAlign: 'right', padding: '2px 0' }}>Rs.{reportData.totalSales.toFixed(0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {reportData.registry && (
                            <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                                <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Cash in Hand:</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Opening Cash:</span>
                                    <span>Rs.{Number(reportData.registry.opening_cash).toFixed(0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Closing Cash:</span>
                                    <span>Rs.{Number(reportData.registry.closing_cash).toFixed(0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Expenses:</span>
                                    <span>-Rs.{reportData.totalExpenses.toFixed(0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px' }}>
                                    <span>Closing Cash After Expense:</span>
                                    <span>Rs.{Number(reportData.registry.closing_cash_after_expense).toFixed(0)}</span>
                                </div>
                            </div>
                        )}

                        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Order Type:</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ccc' }}>
                                        <th style={{ textAlign: 'left', padding: '2px 0' }}>Order Type</th>
                                        <th style={{ textAlign: 'right', padding: '2px 0' }}>Count</th>
                                        <th style={{ textAlign: 'right', padding: '2px 0' }}>Avg Amount</th>
                                        <th style={{ textAlign: 'right', padding: '2px 0' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(reportData.orderTypeSummary).map(([type, data]: [string, any]) => {
                                        const totalOrders = reportData.totalOrders;
                                        const percentage = totalOrders > 0 ? ((data.count / totalOrders) * 100).toFixed(1) : '0.0';
                                        return (
                                            <tr key={type}>
                                                <td style={{ padding: '2px 0' }}>{type}</td>
                                                <td style={{ textAlign: 'right', padding: '2px 0' }}>{data.count}</td>
                                                <td style={{ textAlign: 'right', padding: '2px 0' }}>Rs.{data.avgAmount.toFixed(0)}</td>
                                                <td style={{ textAlign: 'right', padding: '2px 0' }}>Rs.{data.amount.toFixed(0)} ({percentage}%)</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Payment Mode Summary:</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ccc' }}>
                                        <th style={{ textAlign: 'left', padding: '2px 0' }}>Mode</th>
                                        <th style={{ textAlign: 'right', padding: '2px 0' }}>Count</th>
                                        <th style={{ textAlign: 'right', padding: '2px 0' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(reportData.paymentModeSummary).map(([mode, data]: [string, any]) => (
                                        <tr key={mode}>
                                            <td style={{ padding: '2px 0' }}>{mode}</td>
                                            <td style={{ textAlign: 'right', padding: '2px 0' }}>{data.count}</td>
                                            <td style={{ textAlign: 'right', padding: '2px 0' }}>Rs.{data.amount.toFixed(0)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px' }}>
                                        <td style={{ padding: '2px 0' }}>Total</td>
                                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{reportData.totalOrders}</td>
                                        <td style={{ textAlign: 'right', padding: '2px 0' }}>Rs.{reportData.totalSales.toFixed(0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Cancelled:</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>No. of orders:</span>
                                <span>{reportData.cancelledOrders}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Amount:</span>
                                <span>Rs.{reportData.cancelledAmount.toFixed(0)}</span>
                            </div>
                        </div>

                        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Refunds (deducted from gross):</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>No. of refunds:</span>
                                <span>{reportData.refundCount ?? 0}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Amount:</span>
                                <span>Rs.{(reportData.totalRefunds ?? 0).toFixed(0)}</span>
                            </div>
                        </div>

                        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Gross Sale / MOP:</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Discount:</span>
                                <span>-Rs.{reportData.totalDiscount.toFixed(0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Sale (After Discount):</span>
                                <span>Rs.{reportData.saleAfterDiscount.toFixed(0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Cash GST:</span>
                                <span>Rs.{reportData.totalGST.toFixed(0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Net Amount:</span>
                                <span>Rs.{reportData.netAmount.toFixed(0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '3px solid #000', paddingTop: '8px', marginTop: '8px', fontSize: '16px', fontWeight: 'bold' }}>
                                <span>GROSS SALE:</span>
                                <span>Rs.{(reportData.grossSale || 0).toFixed(0)}</span>
                            </div>
                        </div>

                        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Pending Orders:</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>No of Orders:</span>
                                <span>{reportData.pendingOrders}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Amount:</span>
                                <span>Rs.{reportData.pendingAmount.toFixed(0)}</span>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '8px' }}>
                            <p>--- End of Report ---</p>
                            <p>Generated: {new Date().toLocaleString('en-PK')}</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                        Close
                    </button>
                    <button onClick={handlePrint} className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 flex items-center justify-center gap-2">
                        <Printer size={18} /> Print Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegistryPrintModal;
