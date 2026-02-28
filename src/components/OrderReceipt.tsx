import { forwardRef, useState, useEffect } from 'react';

interface OrderReceiptProps {
    order: any;
}

const OrderReceipt = forwardRef<HTMLDivElement, OrderReceiptProps>(({ order }, ref) => {
    if (!order) return null;

    const [settings, setSettings] = useState({
        shopName: 'Mr. B',
        shopAddress: 'Oppo. Kamalpur Interchange,\nSargodha Road.',
        shopPhone: '03253211234',
        shopLogo: '',
        onlinePaymentId: '',
        receiptRemarks: 'null'
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (!window.api) return;
        try {
            const results = await Promise.all([
                window.api.getSetting('shop_name'),
                window.api.getSetting('shop_address'),
                window.api.getSetting('shop_phone'),
                window.api.getSetting('shop_logo'),
                window.api.getSetting('online_payment_id'),
                window.api.getSetting('receipt_remarks')
            ]);

            setSettings({
                shopName: results[0]?.value || 'Mr. B',
                shopAddress: results[1]?.value || 'Oppo. Kamalpur Interchange,\nSargodha Road.',
                shopPhone: results[2]?.value || '03253211234',
                shopLogo: results[3]?.value || '',
                onlinePaymentId: results[4]?.value || '',
                receiptRemarks: results[5]?.value || 'null'
            });
        } catch (error) {
            console.error("Failed to load settings:", error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div
            ref={ref}
            className="bg-white text-black text-[14px] relative overflow-hidden"
            style={{ width: '80mm', padding: '4mm', fontFamily: 'Arial, sans-serif' }}
        >
            {/* Watermark Background */}
            <div
                className={`absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10`}
                style={{ transform: 'rotate(-45deg)' }}
            >
                <div
                    className="text-6xl font-black tracking-widest text-center"
                    style={{
                        color: order.payment_status === 'Paid' ? '#22c55e' : '#ef4444',
                        WebkitTextStroke: '2px black'
                    }}
                >
                    {order.payment_status === 'Paid' ? 'PAID' : 'UNPAID'}
                </div>
            </div>

            {/* Content Container (placed above watermark) */}
            <div className="relative z-10 bg-transparent">

                {/* Header */}
                <div className="text-center mb-2">
                    {settings.shopLogo && <img src={settings.shopLogo} className="max-w-full max-h-20 object-contain mx-auto mb-2 grayscale" alt="Logo" />}
                    <div className="text-[18px] font-bold mb-0.5">{settings.shopName}</div>
                    <div className="text-[14px] font-bold whitespace-pre-wrap mb-0.5">{settings.shopAddress}</div>
                    <div className="text-[14px] font-bold mb-2">Contact : {settings.shopPhone}</div>
                </div>

                <div className="border border-black py-0.5 mb-2 text-center text-[12px]">
                    Customer Bill
                </div>

                <div className="border border-black py-0.5 mb-2 text-center text-[12px] uppercase">
                    {order.type === 'Dine-in' && 'Dine-in'}
                    {order.type === 'Takeaway' && 'Takeaway'}
                    {order.type === 'Delivery' && 'Delivery'}
                </div>

                <div className="grid grid-cols-[120px_1fr] mb-0.5 text-[12px]">
                    <span className="text-left">Order No :</span>
                    <span className="text-left">{String(order.id).padStart(5, '0')}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] mb-0.5 text-[12px]">
                    <span className="text-left">Date & Time :</span>
                    <span className="text-left">{formatDate(order.created_at)}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] mb-0.5 text-[12px]">
                    <span className="text-left">Waiter :</span>
                    <span className="text-left uppercase">{order.waiter_name || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] mb-0.5 text-[12px]">
                    <span className="text-left">User :</span>
                    <span className="text-left uppercase">ADMIN</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] mb-0.5 text-[12px]">
                    <span className="text-left">Customer Name :</span>
                    <span className="text-left uppercase">{order.customer_name || 'N/A'}</span>
                </div>
                {order.type === 'Delivery' && (
                    <div className="grid grid-cols-[120px_1fr] mb-0.5 text-[12px]">
                        <span className="text-left">Customer Address :</span>
                        <span className="text-left uppercase">{order.delivery_address || 'N/A'}</span>
                    </div>
                )}
                <div className="grid grid-cols-[120px_1fr] mb-0.5 text-[12px]">
                    <span className="text-left">Customer Number :</span>
                    <span className="text-left">{order.customer_phone || 'N/A'}</span>
                </div>

                <table className="w-full mt-1 mb-1 border-b border-dashed border-black">
                    <thead>
                        <tr>
                            <th className="text-left py-1 text-[12px] w-[40%] border-t border-b border-dashed border-black">DESCRIPTION</th>
                            <th className="text-center py-1 text-[12px] w-[15%] border-t border-b border-dashed border-black">QTY</th>
                            <th className="text-center py-1 text-[12px] w-[20%] border-t border-b border-dashed border-black">RATE</th>
                            <th className="text-center py-1 text-[12px] w-[25%] border-t border-b border-dashed border-black">AMOUNTPKR<br />(S)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(order.items || []).map((item: any, index: number) => (
                            <tr key={index}>
                                <td className="py-1 text-[12px] leading-tight align-top">{item.item_name}</td>
                                <td className="text-center py-1 text-[12px] font-bold leading-tight align-top">
                                    {Number(item.quantity).toFixed(2)}<br />
                                    <span className="font-normal text-[10px]">ps</span>
                                </td>
                                <td className="text-center py-1 text-[12px] align-top">{Number(item.unit_price).toFixed(2)}</td>
                                <td className="text-center py-1 text-[12px] align-top">{Number(item.line_total).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Split Payment Breakdown */}
                {order.payment_status === 'Paid' && order.payments && order.payments.length > 0 && (
                    <div className="mt-2 mb-2 text-[11px] border border-dashed border-gray-400 p-1">
                        <div className="font-bold border-b border-dashed border-gray-300 mb-1">Payment Received:</div>
                        {order.payments.map((payment: any, idx: number) => {
                            return (
                                <div key={idx} className="flex justify-between">
                                    <span>{payment.payment_type}</span>
                                    <span>{Number(payment.amount).toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex justify-between mt-2 text-[12px]">
                    <div className="w-1/2">No Of Items: {order.items?.length || 0}</div>
                    <div className="w-1/2">
                        <div className="flex justify-between">
                            <span className="text-left">Total Qty: {order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
                            <span>{Number(order.subtotal).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="ml-[30%] mt-4 text-[12px]">
                    {Number(order.discount) > 0 && (
                        <div className="flex justify-between border-b border-black mb-1 pb-1">
                            <span>Discount :</span>
                            <span>-{Number(order.discount).toFixed(2)}</span>
                        </div>
                    )}
                    {Number(order.delivery_charges) > 0 && (
                        <div className="flex justify-between border-b border-black mb-1 pb-1">
                            <span>Delivery Charges :</span>
                            <span>{Number(order.delivery_charges).toFixed(2)}</span>
                        </div>
                    )}
                    {Number(order.service_charges) > 0 && (
                        <div className="flex justify-between border-b border-black mb-1 pb-1">
                            <span>Service Charges :</span>
                            <span>{Number(order.service_charges).toFixed(2)}</span>
                        </div>
                    )}
                    {Number(order.gst) > 0 && (
                        <div className="flex justify-between border-b border-black mb-1 pb-1">
                            <span>GST :</span>
                            <span>{Number(order.gst).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-b border-black mb-1 pb-1 font-bold text-[16px]">
                        <span>Total :</span>
                        <span>{Number(order.total).toFixed(2)}</span>
                    </div>
                </div>

                <div className="mt-8 text-[12px]">
                    {settings.onlinePaymentId && (
                        <>
                            <div>For Online Payment. Raast ID</div>
                            <div>({settings.onlinePaymentId})</div>
                        </>
                    )}
                    <div>Thank you.</div>
                    <div>Remarks: {settings.receiptRemarks}</div>
                </div>

                <div className="border border-black p-1 mt-4 flex justify-between text-[11px]">
                    <span>Print Date: {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                    <span>Print Time: {new Date().toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                </div>

            </div> {/* End Content Container */}
        </div>
    );
});

OrderReceipt.displayName = 'OrderReceipt';

export default OrderReceipt;
