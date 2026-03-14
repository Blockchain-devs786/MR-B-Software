import { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onPaymentComplete: (orderId: number, status: string, splitPayments: any[]) => void;
}

type PaymentReceivingFrom = 'Cash' | 'Credit' | 'Bank Transfer' | 'Card' | 'Other';
const paymentOptions: PaymentReceivingFrom[] = ['Cash', 'Credit', 'Bank Transfer', 'Card', 'Other'];

const PaymentModal = ({ isOpen, onClose, order, onPaymentComplete }: PaymentModalProps) => {
    const [splitPayments, setSplitPayments] = useState<{ type: PaymentReceivingFrom, amount: string, account_id: number | null }[]>([]);
    const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && window.api) {
            document.body.style.overflow = 'hidden';
            window.api.getAllPaymentAccounts().then(res => {
                if (res.success) setPaymentAccounts(res.data || []);
            });
            // Auto add cash payment taking full amount
            setSplitPayments([{ type: 'Cash', amount: String(order?.total || 0), account_id: null }]);
        } else if (!isOpen) {
            document.body.style.overflow = '';
            setSplitPayments([]);
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, order]);

    if (!isOpen || !order) return null;

    const confirmPayment = () => {
        const totalReceived = splitPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        if (totalReceived < Number(order.total)) return;
        
        // Ensure all non-cash non-other payments have accounts
        if (splitPayments.some(p => p.type !== 'Cash' && p.type !== 'Other' && !p.account_id)) {
            return;
        }

        onPaymentComplete(order.id, 'Paid', splitPayments);
    };

    const paymentOrderDisplayNum = order.displayNum || order.id;
    const orderTotal = Number(order.total).toFixed(0);

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold">Collect Payment</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-500">Order</div>
                        <div className="font-bold">#{String(paymentOrderDisplayNum).padStart(3, '0')}</div>
                        <div className="text-sm text-gray-600 mt-1">
                            Total: Rs. {orderTotal}
                        </div>
                    </div>
                    {paymentAccounts.length === 0 ? (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm">
                            Add payment accounts in <strong>Payment Methods</strong> to receive distinct payments. Cash and Other are available.
                        </div>
                    ) : null}

                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {splitPayments.map((payment, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-3 p-3 border border-gray-100 rounded-xl bg-white shadow-sm relative">
                                {splitPayments.length > 1 && (
                                    <button 
                                        onClick={() => setSplitPayments(prev => prev.filter((_, i) => i !== index))}
                                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <div className="flex-1 space-y-3">
                                    <div className="flex gap-2">
                                        <div className="w-1/2">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                            <select 
                                                value={payment.type}
                                                onChange={e => {
                                                    const newType = e.target.value as PaymentReceivingFrom;
                                                    setSplitPayments(prev => prev.map((p, i) => i === index ? { ...p, type: newType, account_id: (newType === 'Cash' || newType === 'Other') ? null : p.account_id } : p));
                                                }}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500"
                                            >
                                                {paymentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-1/2">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Amount (Rs.)</label>
                                            <div className="flex">
                                                <input 
                                                    type="number" 
                                                    value={payment.amount}
                                                    onChange={e => setSplitPayments(prev => prev.map((p, i) => i === index ? { ...p, amount: e.target.value } : p))}
                                                    className="w-full p-2 border border-gray-200 rounded-l-lg text-sm outline-none focus:border-orange-500"
                                                    placeholder="Amount"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const currentOtherSum = splitPayments.reduce((sum, p, i) => i !== index ? sum + Number(p.amount || 0) : sum, 0);
                                                        const remaining = Math.max(0, Number(order?.total) - currentOtherSum);
                                                        setSplitPayments(prev => prev.map((p, i) => i === index ? { ...p, amount: remaining.toString() } : p));
                                                    }}
                                                    className="px-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg text-xs font-medium hover:bg-gray-200 text-gray-600"
                                                    title="Fill remaining amount"
                                                >
                                                    Max
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Account</label>
                                        {payment.type === 'Cash' ? (
                                            <div className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-700 font-medium cursor-not-allowed">
                                                IN DRAW
                                            </div>
                                        ) : payment.type === 'Other' ? (
                                            <div className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500">
                                                N/A
                                            </div>
                                        ) : (
                                            <select 
                                                value={payment.account_id || ''}
                                                onChange={e => setSplitPayments(prev => prev.map((p, i) => i === index ? { ...p, account_id: e.target.value ? Number(e.target.value) : null } : p))}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500"
                                            >
                                                <option value="">Select Account</option>
                                                {paymentAccounts.map(account => (
                                                    <option key={account.id} value={account.id}>
                                                        {account.payment_method_name} - {account.account_number} {account.account_label ? `(${account.account_label})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => setSplitPayments(prev => [...prev, { type: 'Bank Transfer', amount: '', account_id: null }])}
                        className="w-full py-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-medium flex justify-center items-center gap-2 transition-colors"
                    >
                        <Plus size={16} /> Add Split Payment
                    </button>

                    {(() => {
                        const totalReceived = splitPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                        const remaining = Math.max(0, Number(order?.total) - totalReceived);
                        const isComplete = totalReceived >= Number(order?.total);

                        return (
                            <div className={`p-3 rounded-xl border ${isComplete ? 'bg-green-50 border-green-200 text-green-800' : 'bg-orange-50 border-orange-200 text-orange-800'} flex justify-between items-center font-bold`}>
                                <span>Received: Rs. {totalReceived}</span>
                                {isComplete ? (
                                    <span className="flex items-center gap-1"><Check size={16} /> Fully Paid</span>
                                ) : (
                                    <span>Remaining: Rs. {remaining}</span>
                                )}
                            </div>
                        );
                    })()}

                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmPayment}
                            disabled={splitPayments.reduce((s, p) => s + Number(p.amount || 0), 0) < Number(order?.total) || splitPayments.some(p => p.type !== 'Cash' && p.type !== 'Other' && !p.account_id)}
                            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Complete Entry
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
