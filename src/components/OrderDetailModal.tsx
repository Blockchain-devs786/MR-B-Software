
import { X, Printer, Edit2, User } from 'lucide-react';

interface OrderDetailModalProps {
    order: Order;
    onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
    if (!order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Order #{order.id}</h2>
                        <p className="text-sm text-gray-500">Table {order.table_number || 'N/A'} • {order.type}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-4">
                        {order.items?.map((item, index) => (
                            <div key={index} className="flex justify-between items-start py-2 border-b border-dashed border-gray-100 last:border-0">
                                <div className="flex gap-3">
                                    <span className="font-bold text-gray-900">{item.quantity}x</span>
                                    <span className="text-gray-700">{item.item_name}</span>
                                </div>
                                <span className="font-medium text-gray-900">Rs. {Number(item.price).toFixed(0)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-900">Rs. {Number(order.total).toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xl font-bold text-gray-900 mt-2">
                            <span>Total</span>
                            <span>Rs. {Number(order.total).toFixed(0)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">
                        <Printer size={18} /> Print
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors">
                        <Edit2 size={18} /> Edit
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors">
                        <User size={18} /> Assign
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;
