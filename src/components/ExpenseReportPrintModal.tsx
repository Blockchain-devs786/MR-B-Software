import { useRef } from 'react';
import { X, Printer } from 'lucide-react';

interface ExpenseReportPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    expenses: any[];
    registry: any;
    totalExpenses: number;
}

const ExpenseReportPrintModal = ({ isOpen, onClose, expenses, registry, totalExpenses }: ExpenseReportPrintModalProps) => {
    const printRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

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
    <title>Expense Report</title>
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
        .grand-total {
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
    <div class="subheader border-dashed">EXPENSE REPORT</div>
    
    ${registry ? `
    <div class="border-dashed">
        <div class="section-title">Registry Time:</div>
        <div class="flex"><span>Start:</span><span>${new Date(registry.start_time).toLocaleString('en-PK')}</span></div>
        <div class="flex"><span>End:</span><span>${registry.end_time ? new Date(registry.end_time).toLocaleString('en-PK') : 'Still Open'}</span></div>
    </div>
    ` : ''}

    <div class="border-dashed">
        <div class="section-title">Expense Details:</div>
        <table>
            <thead>
                <tr>
                    <th class="text-left">#</th>
                    <th class="text-left">Description</th>
                    <th class="text-left">Category</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${expenses.map((exp: any, idx: number) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${exp.description}</td>
                        <td>${exp.category || '-'}</td>
                        <td class="text-right">Rs.${Number(exp.amount).toFixed(0)}</td>
                    </tr>
                `).join('')}
                ${expenses.length === 0 ? `
                    <tr><td colspan="4" class="text-center" style="padding: 8px 0;">No expenses recorded</td></tr>
                ` : ''}
            </tbody>
        </table>
    </div>

    <div class="flex grand-total">
        <span>TOTAL EXPENSES:</span>
        <span>Rs.${totalExpenses.toFixed(0)}</span>
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
                    <h2 className="text-xl font-bold">Print Expense Report</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <div ref={printRef} className="bg-white text-black text-[12px]" style={{ width: '80mm', padding: '4mm', fontFamily: 'Arial, sans-serif' }}>
                        {/* Print preview content */}
                        <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Mr B</div>
                        <div style={{ textAlign: 'center', fontSize: '10px', borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>EXPENSE REPORT</div>

                        {registry && (
                            <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                                <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Registry Time:</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Start:</span>
                                    <span>{new Date(registry.start_time).toLocaleString('en-PK')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>End:</span>
                                    <span>{registry.end_time ? new Date(registry.end_time).toLocaleString('en-PK') : 'Still Open'}</span>
                                </div>
                            </div>
                        )}

                        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>Expense Details:</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ccc' }}>
                                        <th style={{ textAlign: 'left', padding: '2px 0', width: '20px' }}>#</th>
                                        <th style={{ textAlign: 'left', padding: '2px 0' }}>Description</th>
                                        <th style={{ textAlign: 'left', padding: '2px 0' }}>Category</th>
                                        <th style={{ textAlign: 'right', padding: '2px 0' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map((exp: any, idx: number) => (
                                        <tr key={exp.id || idx}>
                                            <td style={{ padding: '2px 0' }}>{idx + 1}</td>
                                            <td style={{ padding: '2px 0' }}>{exp.description}</td>
                                            <td style={{ padding: '2px 0' }}>{exp.category || '-'}</td>
                                            <td style={{ textAlign: 'right', padding: '2px 0' }}>Rs.{Number(exp.amount).toFixed(0)}</td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '8px 0', color: '#999' }}>No expenses recorded</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '3px solid #000', paddingTop: '8px', marginTop: '8px', fontSize: '16px', fontWeight: 'bold' }}>
                            <span>TOTAL EXPENSES:</span>
                            <span>Rs.{totalExpenses.toFixed(0)}</span>
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

export default ExpenseReportPrintModal;
