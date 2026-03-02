import { useState, useEffect, useRef } from 'react';
import { Plus, Clock, User, MapPin, Phone, Utensils, ShoppingBag, Truck, CreditCard, Eye, EyeOff, X, RotateCcw, Printer, Search, Check } from 'lucide-react';
import PrintPreviewModal from '../components/PrintPreviewModal';
import WhatsAppButton from '../components/WhatsAppButton';
import OrderSidePanel from '../components/OrderSidePanel'; // Import Side Panel
import { useToast } from '../components/Toast';

type TabType = 'all' | 'pending' | 'preparing' | 'ready' | 'completed' | 'pending-payment';

const statusColors: Record<string, string> = {
    Pending: 'bg-orange-100 text-orange-700 border-orange-200',
    Preparing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Ready: 'bg-green-100 text-green-700 border-green-200',
    Completed: 'bg-blue-100 text-blue-700 border-blue-200',
    Refunded: 'bg-red-100 text-red-700 border-red-200',
    Cancelled: 'bg-gray-200 text-gray-600 border-gray-300',
};

const typeIcons: Record<string, any> = {
    'Dine-in': Utensils,
    'Takeaway': ShoppingBag,
    'Delivery': Truck,
};

const Orders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [currentRegistry, setCurrentRegistry] = useState<{ id: number } | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [registrySale, setRegistrySale] = useState<number | null>(null);
    const [showSale, setShowSale] = useState(true);
    // Side Panel States
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [allItems, setAllItems] = useState<any[]>([]); // Store all items for search

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [refundAmount, setRefundAmount] = useState(0);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printOrder, setPrintOrder] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
    const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
    const [orderToEdit, setOrderToEdit] = useState<any>(null);
    const { showToast } = useToast();

    const openPanelToChangeOrder = (order: any) => {
        if (!currentRegistry) {
            showToast('Start a registry to change orders.');
            return;
        }
        const cartFromOrder = (order.items || []).map((i: any) => ({
            id: i.item_id,
            name: i.item_name,
            unit_price: Number(i.unit_price),
            quantity: i.quantity,
            discount: Number(i.discount || 0),
            note: i.note || ''
        }));
        setOrderToEdit(order);
        setCart(cartFromOrder);
        setIsSidePanelOpen(true);
    };

    const closeSidePanel = () => {
        setIsSidePanelOpen(false);
        setOrderToEdit(null);
        setCart([]);
    };

    const fetchOrders = async () => {
        if (!window.api) return;
        const regRes = await window.api.getCurrentRegistry();
        const registry = regRes?.success && regRes?.data ? regRes.data : null;
        setCurrentRegistry(registry ? { id: registry.id } : null);

        if (!registry) {
            setOrders([]);
            return;
        }

        const res = await window.api.getOrders({ registryId: registry.id });
        if (res.success) setOrders(res.data ?? []);

        // Also fetch registry summary to show today's sale
        const summaryRes = await window.api.getRegistrySummary(registry.id);
        if (summaryRes.success && summaryRes.data) {
            const { orders: sumOrders, refunds: sumRefunds } = summaryRes.data;
            let totalSales = 0, totalDiscount = 0, totalService = 0, totalGST = 0;
            const tRefunds = (sumRefunds || []).reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0);

            (sumOrders || []).forEach((o: any) => {
                if (o.status !== 'Cancelled') {
                    totalSales += Number(o.total || 0);
                    totalDiscount += Number(o.discount || 0);
                    totalService += Number(o.service_charges || 0);
                    totalGST += Number(o.gst || 0);
                }
            });
            const grossSale = totalSales - totalDiscount + totalService + totalGST - tRefunds;
            setRegistrySale(grossSale);
        } else {
            setRegistrySale(null);
        }
    };

    // Load items for search
    useEffect(() => {
        if (window.api) {
            window.api.getItems().then(res => {
                if (res.success) setAllItems(res.data);
            });
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // ... (Payment modal logic remains same or similar)
        if (showPaymentModal && window.api) {
            document.body.style.overflow = 'hidden';
            window.api.getAllPaymentAccounts().then(res => {
                if (res.success) setPaymentAccounts(res.data || []);
            }).catch(err => {
                console.error('Error fetching payment accounts:', err);
                setPaymentAccounts([]);
            });
        } else if (!showPaymentModal) {
            document.body.style.overflow = '';
            setPaymentAccounts([]);
        }
        return () => { document.body.style.overflow = ''; };
    }, [showPaymentModal]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl + N: Open & Focus Side Panel (only when registry is open)
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                if (!currentRegistry) {
                    showToast('Start a registry to place orders.');
                    return;
                }
                setIsSidePanelOpen(true);
                // Blur search if active
                if (searchInputRef.current) {
                    searchInputRef.current.blur();
                    setIsSearchActive(false);
                }
                // Dispatch focus event
                setTimeout(() => window.dispatchEvent(new CustomEvent('focus-order-panel')), 50);
                return;
            }

            // Ctrl + S: Focus Search
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                setIsSidePanelOpen(true); // Ensure panel is open so we can see what we add
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentRegistry, showToast]);

    // Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearchActive(false);
            return;
        }

        const query = searchQuery.toLowerCase();
        const results = allItems.filter(item =>
            item.name.toLowerCase().includes(query) ||
            String(item.id).includes(query)
        ).slice(0, 10);

        setSearchResults(results);
        setIsSearchActive(true);
        setHighlightIndex(0);
    }, [searchQuery, allItems]);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex(prev => Math.min(prev + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && searchResults[highlightIndex]) {
                addItemToCart(searchResults[highlightIndex]);
                setSearchQuery('');
                setIsSearchActive(false);
            }
        } else if (e.key === 'Escape') {
            setSearchQuery('');
            setIsSearchActive(false);
            searchInputRef.current?.blur();
        }
    };

    const addItemToCart = (item: any) => {
        setIsSidePanelOpen(true);
        setCart(prev => {
            const existing = prev.find(c => c.id === item.id);
            if (existing) {
                return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { id: item.id, name: item.name, unit_price: Number(item.price), quantity: 1, discount: 0, note: '' }];
        });
    };

    // ... (Refund & Payment functions remain same, omitted for brevity but logic should persist if not replacing)
    // RE-IMPLEMENTING REFUND/PAYMENT/TAB LOGIC TO PREVENT LOSS
    const openRefundModal = (order: any) => {
        setSelectedOrder(order);
        setRefundAmount(Number(order.total));
        setRefundReason('');
        setShowRefundModal(true);
    };

    const submitRefund = async () => {
        if (!selectedOrder || !window.api) return;
        if (!refundReason.trim()) {
            showToast('Please enter a reason for the refund');
            return;
        }
        if (refundAmount <= 0) {
            showToast('Refund amount must be greater than 0');
            return;
        }
        const res = await window.api.addRefund({
            order_id: selectedOrder.id,
            amount: refundAmount,
            reason: refundReason
        });
        if (res.success) {
            setShowRefundModal(false);
            setSelectedOrder(null);
            fetchOrders();
            showToast('Refund processed successfully!', 'success');
        } else {
            showToast('Failed to process refund: ' + res.error);
        }
    };

    const submitCancelOrder = async () => {
        if (cancelOrderId == null || !window.api) return;
        const res = await window.api.cancelOrder(cancelOrderId, cancelReason || 'Cancelled by user');
        if (res.success) {
            setShowCancelModal(false);
            setCancelOrderId(null);
            setCancelReason('');
            fetchOrders();
            showToast('Order cancelled');
        } else {
            showToast('Failed to cancel order: ' + res.error);
        }
    };

    const updateStatus = async (orderId: number, status: string) => {
        if (window.api) {
            await window.api.updateOrderStatus(orderId, status);
            fetchOrders();
        }
    };

    type PaymentReceivingFrom = 'Cash' | 'Credit' | 'Bank Transfer' | 'Card' | 'Other';
    const paymentOptions: PaymentReceivingFrom[] = ['Cash', 'Bank Transfer', 'Credit', 'Card', 'Other'];

    interface SplitPayment {
        type: PaymentReceivingFrom;
        amount: string; // Keep as string for input flexibility
        account_id: number | null;
    }

    const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);

    const collectPayment = (orderId: number) => {
        setPaymentOrderId(orderId);
        setSplitPayments([{ type: 'Cash', amount: '', account_id: null }]);
        setShowPaymentModal(true);
    };

    const confirmPayment = async () => {
        if (!paymentOrderId || !window.api) {
            showToast('Invalid order or API not available');
            return;
        }

        const order = orders.find(o => o.id === paymentOrderId);
        if (!order) return;
        const totalAmount = Number(order.total);

        const validPayments = splitPayments.filter(p => Number(p.amount) > 0);

        if (validPayments.length === 0) {
            showToast('Please enter at least one payment amount');
            return;
        }

        let currentTotal = 0;
        const finalPayments: any[] = [];

        for (const p of validPayments) {
            if (p.type !== 'Cash' && p.type !== 'Other' && !p.account_id) {
                showToast(`Please select a payment account for ${p.type}`);
                return;
            }
            const amount = Number(p.amount);
            currentTotal += amount;
            finalPayments.push({
                type: p.type,
                account_id: p.account_id,
                amount: amount
            });
        }

        if (currentTotal < totalAmount) {
            showToast(`Total received (Rs. ${currentTotal}) is less than order total (Rs. ${totalAmount})`);
            return;
        }

        try {
            // Build legacy payment method string from the first non-cash payment to preserve legacy behaviour somewhat
            const firstAccountPayment = finalPayments.find(p => p.account_id);
            let paymentMethodStr = '';

            if (firstAccountPayment) {
                const account = paymentAccounts.find(acc => acc.id === firstAccountPayment.account_id);
                if (account) {
                    paymentMethodStr = `${account.payment_method_name} - ${account.account_number}${account.account_label ? ` (${account.account_label})` : ''}`;
                }
            } else {
                // If no account payment, it's Cash — use 'IN DRAW'
                paymentMethodStr = 'IN DRAW';
            }

            // Type represents dominant or primary type
            const paymentType = finalPayments[0]?.type || 'Cash';

            const res = await window.api.updatePaymentStatus(paymentOrderId, 'Paid', paymentMethodStr, paymentType, finalPayments);
            if (res.success) {
                setShowPaymentModal(false);
                setPaymentOrderId(null);
                setSplitPayments([]);
                fetchOrders();
                showToast('Payment collected successfully!', 'success');
            } else {
                showToast('Failed to collect payment: ' + (res.error || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Error collecting payment:', error);
            showToast('Error collecting payment: ' + (error.message || 'Unknown error'));
        }
    };

    const filteredOrders = orders.filter(order => {
        switch (activeTab) {
            case 'pending': return order.status === 'Pending';
            case 'preparing': return order.status === 'Preparing';
            case 'ready': return order.status === 'Ready';
            case 'completed': return order.status === 'Completed' && order.payment_status === 'Paid';
            case 'pending-payment': return order.status === 'Completed' && order.payment_status === 'Pending';
            default: return true;
        }
    });

    const tabs: { key: TabType; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: orders.length },
        { key: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'Pending').length },
        { key: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'Preparing').length },
        { key: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'Ready').length },
        { key: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'Completed' && o.payment_status === 'Paid').length },
        { key: 'pending-payment', label: 'Pending Payment', count: orders.filter(o => o.status === 'Completed' && o.payment_status === 'Pending').length },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300">
                <div className="p-6 h-full flex flex-col overflow-y-auto">
                    {/* Header with Search */}
                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
                        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
                                <p className="text-gray-500">Manage all incoming orders</p>
                            </div>
                            {currentRegistry && registrySale !== null && (
                                <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl flex items-center gap-2 border border-orange-200 whitespace-nowrap">
                                    <span className="text-sm font-medium">Today's Registry Sale:</span>
                                    {showSale ? (
                                        <span className="font-bold text-lg">Rs. {registrySale.toFixed(0)}</span>
                                    ) : (
                                        <span className="font-bold text-lg">Rs. ****</span>
                                    )}
                                    <button
                                        onClick={() => setShowSale(!showSale)}
                                        className="p-1 hover:bg-orange-200 rounded-lg transition-colors"
                                        title={showSale ? 'Hide sale amount' : 'Show sale amount'}
                                    >
                                        {showSale ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 flex-1 lg:justify-end min-w-0">
                            {/* Item Search Bar */}
                            <div className="relative w-full max-w-96 min-w-[200px] shrink-1">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all bg-white"
                                    placeholder="Search items (Ctrl+S)..."
                                />
                                {isSearchActive && searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-50">
                                        {searchResults.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                className={`p-3 flex justify-between items-center cursor-pointer ${idx === highlightIndex ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                                                onClick={() => { addItemToCart(item); setSearchQuery(''); setIsSearchActive(false); }}
                                            >
                                                <span className="font-medium text-gray-800">#{item.id} - {item.name}</span>
                                                <span className="font-bold text-orange-600">Rs. {Number(item.price).toFixed(0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    if (!currentRegistry) {
                                        showToast('Start a registry to place orders.');
                                        return;
                                    }
                                    setIsSidePanelOpen(!isSidePanelOpen);
                                }}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-lg ${!currentRegistry ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : isSidePanelOpen ? 'bg-orange-100 text-orange-600' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200'}`}
                                title={currentRegistry ? 'Toggle New Order Panel (Ctrl+N)' : 'Start a registry to place orders'}
                            >
                                <Plus size={20} className={isSidePanelOpen ? "rotate-45 transition-transform" : ""} /> {isSidePanelOpen ? 'Close Panel' : 'New Order'}
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 shrink-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
                            </button>
                        ))}
                    </div>

                    {!currentRegistry && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 text-amber-800">
                            <p className="font-medium">Start a registry to place orders and view orders here.</p>
                        </div>
                    )}

                    {/* Order Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-6 gap-3 pb-20">
                        {filteredOrders.map((order) => {
                            const TypeIcon = typeIcons[order.type] || Utensils;
                            const nextStatus = order.status === 'Pending' ? 'Preparing' : order.status === 'Preparing' ? 'Ready' : order.status === 'Ready' ? 'Completed' : null;
                            const nextButtonLabel = order.status === 'Pending' ? 'Start' : order.status === 'Preparing' ? 'Ready' : order.status === 'Ready' ? 'Complete' : null;
                            const nextButtonColor = order.status === 'Pending' ? 'bg-red-500 hover:bg-red-600' : order.status === 'Preparing' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600';
                            const orderDisplayNum = orders.findIndex((o: any) => o.id === order.id) + 1;

                            return (
                                <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Card Header & Content */}
                                    <div className="p-2.5 border-b border-gray-50">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-base font-bold text-gray-900">#{String(orderDisplayNum).padStart(3, '0')}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${statusColors[order.status]}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-400 text-[11px] font-medium max-w-[45%] text-right justify-end">
                                                <TypeIcon size={12} className="shrink-0" />
                                                <span className="leading-tight break-words min-w-0">
                                                    {order.type === 'Takeaway' ? (
                                                        <>Take<wbr />-away</>
                                                    ) : order.type === 'Delivery' ? (
                                                        <>Deli<wbr />very</>
                                                    ) : (
                                                        order.type
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Order Info */}
                                        <div className="space-y-0.5 text-xs text-gray-600">
                                            {order.type === 'Dine-in' && (
                                                <>
                                                    <div className="flex items-center gap-1.5">
                                                        <Utensils size={12} className="text-gray-400" />
                                                        <span>Table {order.table_number || 'N/A'}</span>
                                                    </div>
                                                    {order.waiter_name && (
                                                        <div className="flex items-center gap-1.5">
                                                            <User size={12} className="text-gray-400" />
                                                            <span>{order.waiter_name}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {(order.type === 'Takeaway' || order.type === 'Delivery') && (
                                                <>
                                                    <div className="flex items-center gap-1.5">
                                                        <User size={12} className="text-gray-400" />
                                                        <span>{order.customer_name || 'Guest'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone size={12} className="text-gray-400" />
                                                        <span>{order.customer_phone || 'N/A'}</span>
                                                    </div>
                                                </>
                                            )}
                                            {order.type === 'Delivery' && (
                                                <>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={12} className="text-gray-400" />
                                                        <span className="truncate">{order.delivery_address || 'N/A'}</span>
                                                    </div>
                                                    {order.rider_name && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Truck size={12} className="text-gray-400" />
                                                            <span>{order.rider_name}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-gray-50/50">
                                                <Clock size={12} className="text-gray-400" />
                                                <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="p-2.5 bg-gray-50 space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-bold text-base text-gray-900">Rs. {Number(order.total).toFixed(0)}</span>
                                            <div className="flex flex-wrap gap-1.5 justify-end">
                                                {order.payment_status !== 'Paid' && order.status !== 'Cancelled' && order.status !== 'Refunded' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setCancelOrderId(order.id); setShowCancelModal(true); setCancelReason(''); }}
                                                        className="p-1.5 bg-white border border-red-200 rounded hover:bg-red-50 text-red-600 flex items-center justify-center"
                                                        title="Cancel order (only before payment)"
                                                    >
                                                        <span className="text-[13px] leading-none" aria-hidden>🚫</span>
                                                    </button>
                                                )}
                                                {(order.status === 'Pending' || order.status === 'Preparing') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openPanelToChangeOrder(order); }}
                                                        className="p-1.5 bg-white border border-green-200 rounded hover:bg-green-50 text-green-600 flex items-center justify-center"
                                                        title="Change order"
                                                    >
                                                        <span className="text-[13px] leading-none" aria-hidden>♻️</span>
                                                    </button>
                                                )}
                                                <div className="scale-90 origin-right flex items-center">
                                                    <WhatsAppButton order={order} />
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPrintOrder(order); setShowPrintModal(true); }}
                                                    className="p-1.5 bg-white border border-gray-200 rounded hover:bg-orange-50 flex items-center justify-center"
                                                    title="Print Receipt"
                                                >
                                                    <Printer size={14} className="text-orange-500" />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-100 flex items-center justify-center"
                                                    title="View Details"
                                                >
                                                    <Eye size={14} className="text-gray-600" />
                                                </button>
                                            </div>
                                        </div>
                                        {order.status === 'Completed' && order.payment_status === 'Pending' ? (
                                            <button
                                                onClick={() => collectPayment(order.id)}
                                                className="w-full py-1.5 bg-green-500 hover:bg-green-600 text-white rounded font-medium text-xs flex items-center justify-center gap-1"
                                            >
                                                <CreditCard size={12} /> Collect Payment
                                            </button>
                                        ) : order.status === 'Completed' && order.payment_status === 'Paid' ? (
                                            <div className="w-full py-1.5 bg-gray-100 text-gray-600 rounded font-medium text-xs text-center">
                                                Payment Received
                                            </div>
                                        ) : nextStatus && (
                                            <button
                                                onClick={() => updateStatus(order.id, nextStatus)}
                                                className={`w-full py-1.5 ${nextButtonColor} text-white rounded font-medium text-xs`}
                                            >
                                                {nextButtonLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {filteredOrders.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <p>{currentRegistry ? 'No orders found in this category.' : 'Start a registry to place orders and view orders here.'}</p>
                    </div>
                )}
            </div>

            {/* Side Panel */}
            <div className={`transition-all duration-300 ease-in-out ${isSidePanelOpen ? 'w-96 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full'} bg-white shadow-2xl z-20`}>
                <OrderSidePanel
                    isOpen={isSidePanelOpen}
                    onClose={closeSidePanel}
                    onOrderCreated={fetchOrders}
                    cart={cart}
                    onUpdateCart={setCart}
                    hasOpenRegistry={!!currentRegistry}
                    initialOrder={orderToEdit}
                />
            </div>


            {/* Modals (Payment, Refund, Details, Print) - Keep outside main flow */}
            {/* Payment Method Selection Modal */}
            {showPaymentModal && paymentOrderId && (() => {
                const order = orders.find(o => o.id === paymentOrderId);
                const orderTotal = order?.total ? Number(order.total).toFixed(0) : '0';
                const paymentOrderDisplayNum = order ? orders.findIndex((o: any) => o.id === paymentOrderId) + 1 : paymentOrderId;

                return (
                    <div
                        className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowPaymentModal(false);
                                setPaymentOrderId(null);
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
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        setPaymentOrderId(null);
                                        setSplitPayments([]);
                                    }}
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
                                        onClick={() => {
                                            setShowPaymentModal(false);
                                            setPaymentOrderId(null);
                                            setSplitPayments([]);
                                        }}
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
            })()}

            {/* Order Detail Modal */}
            {selectedOrder && (() => {
                const detailDisplayNum = orders.findIndex((o: any) => o.id === selectedOrder.id) + 1 || selectedOrder.id;
                return (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <h2 className="text-xl font-bold">Order #{String(detailDisplayNum).padStart(3, '0')}</h2>
                                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="flex gap-2">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${statusColors[selectedOrder.status]}`}>
                                        {selectedOrder.status}
                                    </span>
                                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600">
                                        {selectedOrder.type}
                                    </span>
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${selectedOrder.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {selectedOrder.payment_status === 'Paid' ? 'Paid' : 'Unpaid'}
                                    </span>
                                </div>

                                <div className="border border-gray-100 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-2 text-left font-medium text-gray-500">Item</th>
                                                <th className="p-2 text-center font-medium text-gray-500">Qty</th>
                                                <th className="p-2 text-right font-medium text-gray-500">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(selectedOrder.items || []).map((item: any) => (
                                                <tr key={item.id} className="border-t border-gray-50">
                                                    <td className="p-2 text-gray-900">{item.item_name}</td>
                                                    <td className="p-2 text-center text-gray-600">{item.quantity}</td>
                                                    <td className="p-2 text-right text-gray-900">Rs. {Number(item.line_total).toFixed(0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t border-gray-100 pt-3 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span>Rs. {Number(selectedOrder.subtotal).toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-red-600">
                                        <span>Discount</span>
                                        <span>- Rs. {Number(selectedOrder.discount).toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span>Rs. {Number(selectedOrder.total).toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-100 flex gap-3">
                                <button onClick={() => setSelectedOrder(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                                    Close
                                </button>
                                {selectedOrder.status === 'Completed' && selectedOrder.payment_status === 'Paid' && (
                                    <button
                                        onClick={() => openRefundModal(selectedOrder)}
                                        className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw size={18} /> Refund
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Print Preview Modal */}
            <PrintPreviewModal
                isOpen={showPrintModal}
                onClose={() => { setShowPrintModal(false); setPrintOrder(null); }}
                order={printOrder}
            />

            {/* Cancel Order Modal */}
            {showCancelModal && cancelOrderId !== null && (() => {
                const cancelDisplayNum = orders.find((o: any) => o.id === cancelOrderId) ? orders.findIndex((o: any) => o.id === cancelOrderId) + 1 : cancelOrderId;
                return (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => { setShowCancelModal(false); setCancelOrderId(null); setCancelReason(''); }}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900">Cancel order</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Order #{String(cancelDisplayNum).padStart(3, '0')} will be cancelled. This cannot be undone.</p>
                            </div>
                            <div className="p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                                <input
                                    type="text"
                                    value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)}
                                    placeholder="e.g. Customer left, Wrong order"
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-orange-500 outline-none"
                                />
                            </div>
                            <div className="p-4 border-t border-gray-100 flex gap-3">
                                <button onClick={() => { setShowCancelModal(false); setCancelOrderId(null); setCancelReason(''); }} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                                    Keep order
                                </button>
                                <button onClick={submitCancelOrder} className="flex-1 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600">
                                    🚫 Cancel order
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Refund Modal */}
            {showRefundModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-red-600">Process Refund</h2>
                            <button onClick={() => setShowRefundModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm text-gray-500">Order</div>
                                <div className="font-bold">#{String(orders.findIndex((o: any) => o.id === selectedOrder.id) + 1 || selectedOrder.id).padStart(3, '0')}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount (Rs.)</label>
                                <input
                                    type="number"
                                    value={refundAmount}
                                    onChange={e => setRefundAmount(Number(e.target.value))}
                                    max={Number(selectedOrder.total)}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-orange-500 outline-none"
                                />
                                <div className="text-xs text-gray-400 mt-1">Max: Rs. {Number(selectedOrder.total).toFixed(0)}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Refund *</label>
                                <textarea
                                    value={refundReason}
                                    onChange={e => setRefundReason(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    onFocus={e => e.stopPropagation()}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-orange-500 outline-none"
                                    placeholder="Enter reason for refund..."
                                    rows={3}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowRefundModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                                Cancel
                            </button>
                            <button onClick={submitRefund} className="flex-1 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600">
                                Process Refund
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
