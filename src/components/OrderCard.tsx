
import { Clock, MapPin, Bike, User } from 'lucide-react';

interface OrderCardProps {
    order: Order;
    onUpdateStatus: (id: number, status: string) => void;
    onView: (order: Order) => void;
}

const statusColors = {
    Pending: 'bg-red-100 text-red-800 border-red-200',
    Preparing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Ready: 'bg-green-100 text-green-800 border-green-200',
    Served: 'bg-blue-100 text-blue-800 border-blue-200',
    Completed: 'bg-gray-100 text-gray-800 border-gray-200',
    Refunded: 'bg-purple-100 text-purple-800 border-purple-200',
    Cancelled: 'bg-gray-200 text-gray-600 border-gray-300',
};

const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateStatus, onView }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[order.status] || 'bg-gray-100'}`}>
                    {order.status}
                </span>
                <span className="text-gray-500 text-sm font-mono">#{order.id.toString().padStart(5, '0')}</span>
            </div>

            <div className="space-y-2 mb-4">
                {order.table_number && (
                    <div className="flex items-center gap-2 text-gray-700">
                        <MapPin size={16} className="text-gray-400" />
                        <span className="font-medium">Table {order.table_number}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    {order.type === 'Delivery' ? <Bike size={16} /> : <User size={16} />}
                    <span className="text-sm">{order.type}</span>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                <span className="font-bold text-lg">Rs. {Number(order.total).toFixed(0)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                    onClick={() => onView(order)}
                    className="px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                    View
                </button>
                {order.status === 'Pending' && (
                    <button onClick={() => onUpdateStatus(order.id, 'Preparing')} className="px-3 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors">
                        Start
                    </button>
                )}
                {order.status === 'Preparing' && (
                    <button onClick={() => onUpdateStatus(order.id, 'Ready')} className="px-3 py-2 text-sm text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg font-medium transition-colors">
                        Ready
                    </button>
                )}
                {order.status === 'Ready' && (
                    <button onClick={() => onUpdateStatus(order.id, 'Served')} className="px-3 py-2 text-sm text-white bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-colors">
                        Serve
                    </button>
                )}
            </div>
        </div>
    );
};

export default OrderCard;
