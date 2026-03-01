import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Minus, Trash2, Printer } from 'lucide-react';
import { useToast } from './Toast';

interface NewOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOrderCreated: () => void;
}

interface CartItem {
    id: number;
    name: string;
    unit_price: number;
    quantity: number;
    discount: number;
    note?: string;
}

const NewOrderModal = ({ isOpen, onClose, onOrderCreated }: NewOrderModalProps) => {
    const [orderType, setOrderType] = useState<'Dine-in' | 'Takeaway' | 'Delivery'>('Dine-in');
    const [tables, setTables] = useState<any[]>([]);
    const [waiters, setWaiters] = useState<any[]>([]);
    const [riders, setRiders] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
    const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast } = useToast();

    // Form fields
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [selectedWaiter, setSelectedWaiter] = useState<number | null>(null);
    const [selectedRider, setSelectedRider] = useState<number | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryCharges, setDeliveryCharges] = useState<number | ''>('');

    // Customer suggestions
    const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);

    // Navigation state
    const [activeFieldIndex, setActiveFieldIndex] = useState(0);
    const [isDropdownActive, setIsDropdownActive] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);

    // Refs
    const modalRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const addressInputRef = useRef<HTMLTextAreaElement>(null);
    const itemsInputRef = useRef<HTMLInputElement>(null);

    // Cart
    const [cart, setCart] = useState<CartItem[]>([]);

    // Kitchen receipt after place order (token = orderId for kitchen)
    const [showKitchenReceiptModal, setShowKitchenReceiptModal] = useState(false);
    const [kitchenReceiptData, setKitchenReceiptData] = useState<{
        orderId: number;
        orderType: string;
        customer: string;
        orderTaker: string;
        orderTime: Date;
        items: { name: string; quantity: number; note: string }[];
    } | null>(null);

    // Get current field list based on order type
    const fieldList = orderType === 'Dine-in'
        ? ['table', 'waiter', 'items']
        : orderType === 'Takeaway'
            ? ['name', 'phone', 'items']
            : ['name', 'phone', 'address', 'rider', 'items'];

    // Reset field index when order type changes
    useEffect(() => {
        setActiveFieldIndex(0);
        setIsDropdownActive(false);
        setHighlightIndex(-1);
        // Refocus modal so keyboard works
        setTimeout(() => modalRef.current?.focus(), 50);
    }, [orderType]);

    // Auto-focus text inputs when field changes
    useEffect(() => {
        const currentField = fieldList[activeFieldIndex];
        setTimeout(() => {
            if (currentField === 'name') nameInputRef.current?.focus();
            else if (currentField === 'phone') phoneInputRef.current?.focus();
            else if (currentField === 'address') addressInputRef.current?.focus();
            else if (currentField === 'items') itemsInputRef.current?.focus();
            else {
                // For non-text fields (table, waiter, rider), refocus modal for keyboard
                modalRef.current?.focus();
            }
        }, 20);
    }, [activeFieldIndex, orderType]);

    useEffect(() => {
        if (isOpen && window.api) {
            window.api.getAvailableTables().then(res => res.success && setTables(res.data));
            window.api.getWaiters().then(res => res.success && setWaiters(res.data));
            window.api.getAvailableRiders().then(res => res.success && setRiders(res.data));
            window.api.getItems().then(res => res.success && setItems(res.data));
            window.api.getCategories().then(res => res.success && setCategories(res.data));
            window.api.getAllPaymentAccounts().then(res => res.success && setPaymentAccounts(res.data || []));
        }
        // Reset state when modal opens
        if (isOpen) {
            setActiveFieldIndex(0);
            setIsDropdownActive(false);
            setHighlightIndex(-1);
            setSelectedCategory(null);
            setSelectedPaymentAccount(null);
            setSearchQuery('');
        }
    }, [isOpen]);

    // Disable body scroll and focus modal
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => modalRef.current?.focus(), 50);
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Fetch customer suggestions
    const fetchCustomerSuggestions = async (query: string) => {
        if (query && query.length >= 1 && window.api) {
            const res = await window.api.getCustomers(query);
            if (res.success && res.data.length > 0) {
                setCustomerSuggestions(res.data.slice(0, 8));
                setIsDropdownActive(true);
                setHighlightIndex(-1);
            } else {
                setCustomerSuggestions([]);
            }
        } else {
            setCustomerSuggestions([]);
        }
    };

    // Filter categories for search (only show if no category is selected)
    const filteredCategories = !selectedCategory
        ? categories.filter(cat =>
            cat.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 4)
        : [];

    // Filter items for search (by name or ID)
    // If category is selected, only show items from that category
    let itemsToFilter = items;
    if (selectedCategory) {
        itemsToFilter = items.filter(item => item.category_id === selectedCategory);
    }

    // If search query is empty and category is selected, show all items from that category
    // Otherwise, filter by search query
    const filteredItems = searchQuery.trim() === '' && selectedCategory
        ? itemsToFilter.slice(0, 8)
        : itemsToFilter.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(item.id).includes(searchQuery)
        ).slice(0, 8);

    // Combined search results: categories first (if not filtered), then items
    const searchResults = [
        ...filteredCategories.map(cat => ({ ...cat, type: 'category' })),
        ...filteredItems.map(item => ({ ...item, type: 'item' }))
    ].slice(0, 8);

    const selectCategory = (category: any) => {
        setSelectedCategory(category.id);
        setSearchQuery('');
        setIsDropdownActive(false);
        setHighlightIndex(-1);
    };

    const clearCategoryFilter = () => {
        setSelectedCategory(null);
        setSearchQuery('');
        setIsDropdownActive(false);
        setHighlightIndex(-1);
    };

    const addToCart = (item: any) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { id: item.id, name: item.name, unit_price: Number(item.price), quantity: 1, discount: 0, note: '' }]);
        }
        setSearchQuery('');
        setIsDropdownActive(false);
        setHighlightIndex(-1);
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart(cart.map(c => c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
    };

    const updateDiscount = (id: number, discount: number) => {
        setCart(cart.map(c => c.id === id ? { ...c, discount: Math.max(0, discount) } : c));
    };

    const updateNote = (id: number, note: string) => {
        setCart(cart.map(c => c.id === id ? { ...c, note } : c));
    };

    const removeFromCart = (id: number) => {
        setCart(cart.filter(c => c.id !== id));
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const total = subtotal - totalDiscount + (orderType === 'Delivery' ? (Number(deliveryCharges) || 0) : 0);

    const selectCustomer = (customer: any) => {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone || '');
        setDeliveryAddress(customer.address || '');
        setIsDropdownActive(false);
        setHighlightIndex(-1);
    };

    // Get suggestions for current field
    const getCurrentSuggestions = () => {
        const currentField = fieldList[activeFieldIndex];
        if (currentField === 'name' || currentField === 'phone' || currentField === 'address') {
            return customerSuggestions;
        }
        if (currentField === 'items') {
            return searchResults;
        }
        if (currentField === 'table') return tables;
        if (currentField === 'waiter') return waiters;
        if (currentField === 'rider') return riders;
        return [];
    };

    const handleSubmit = async () => {
        if (!window.api) return;

        if (orderType === 'Dine-in' && !selectedTable) {
            showToast('Please select a table');
            return;
        }
        if ((orderType === 'Takeaway' || orderType === 'Delivery') && (!customerName || !customerPhone)) {
            showToast('Please enter customer name and phone');
            return;
        }
        if (orderType === 'Delivery' && !deliveryAddress) {
            showToast('Please enter delivery address');
            return;
        }
        if (cart.length === 0) {
            showToast('Please add items to the order');
            return;
        }

        // Determine payment status and method
        let paymentStatus = 'Pending';
        let paymentMethodStr = 'Pending';

        if (selectedPaymentAccount) {
            const account = paymentAccounts.find(acc => acc.id === selectedPaymentAccount);
            if (account) {
                paymentStatus = 'Paid';
                paymentMethodStr = `${account.payment_method_name} - ${account.account_number}`;
                if (account.account_label) {
                    paymentMethodStr += ` (${account.account_label})`;
                }
            }
        }

        const orderData = {
            type: orderType,
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            delivery_address: deliveryAddress || null,
            table_id: selectedTable,
            waiter_id: selectedWaiter,
            rider_id: selectedRider,
            items: cart,
            subtotal,
            discount: totalDiscount,
            delivery_charges: orderType === 'Delivery' ? (Number(deliveryCharges) || 0) : 0,
            total,
            payment_method: paymentMethodStr,
            payment_status: paymentStatus
        };

        const res = await window.api.createOrder(orderData);
        if (res.success && res.orderId) {
            const orderTime = new Date();
            const customer = orderType === 'Dine-in'
                ? (tables.find(t => t.id === selectedTable) ? `Table ${tables.find(t => t.id === selectedTable)!.table_number}` : '')
                : (customerName || '');
            const orderTaker = orderType === 'Dine-in' ? (waiters.find(w => w.id === selectedWaiter)?.name || '') : '';
            setKitchenReceiptData({
                orderId: res.orderId,
                orderType,
                customer,
                orderTaker,
                orderTime,
                items: cart.map(i => ({ name: i.name, quantity: i.quantity, note: (i.note || '').trim() }))
            });
            setShowKitchenReceiptModal(true);
        } else {
            showToast('Failed to create order: ' + res.error);
        }
    };

    const closeKitchenReceiptAndOrder = () => {
        setShowKitchenReceiptModal(false);
        setKitchenReceiptData(null);
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setDeliveryAddress('');
        setDeliveryCharges('');
        setSelectedTable(null);
        setSelectedWaiter(null);
        setSelectedRider(null);
        setSelectedPaymentAccount(null);
        setOrderType('Dine-in');
        onOrderCreated();
        onClose();
    };

    const handlePrintKitchenReceipt = () => {
        if (!kitchenReceiptData) return;
        const win = window.open('', '_blank', 'width=400,height=600');
        if (!win) {
            showToast('Please allow popups to print kitchen receipt');
            return;
        }
        const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const d = kitchenReceiptData;
        const printTime = new Date();
        const fmt = (dt: Date) => {
            const d = dt.getDate().toString().padStart(2, '0');
            const m = (dt.getMonth() + 1).toString().padStart(2, '0');
            const y = dt.getFullYear().toString().slice(-2);
            const h = dt.getHours();
            const ampm = h >= 12 ? 'pm' : 'am';
            const h12 = h % 12 || 12;
            const min = dt.getMinutes().toString().padStart(2, '0');
            const sec = dt.getSeconds().toString().padStart(2, '0');
            return `${d}/${m}/${y} ${h12}:${min}:${sec} ${ampm}`;
        };
        const rows = d.items.map(i =>
            `<tr><td style="padding:6px 10px;vertical-align:top">${escape(i.name)}${i.note ? `<br><span style="color:#c2410c;font-size:11px">📝 ${escape(i.note)}</span>` : ''}</td><td style="padding:6px 10px;text-align:right;white-space:nowrap;font-weight:600">${i.quantity}</td></tr>`
        ).join('');
        win.document.write(`
            <!DOCTYPE html>
            <html><head><title>Kitchen - Order ${d.orderId}</title>
            <style>
                body{font-family:Arial, sans-serif;padding:4mm;font-size:14px;max-width:80mm;margin:0 auto;color:black;}
                .box{border:2px solid #ea580c;border-radius:8px;padding:12px;margin-bottom:10px;background:#fffbf7}
                .header{text-align:center;font-weight:800;font-size:18px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px dashed #ea580c;letter-spacing:0.5px}
                .line{padding:3px 0;border-bottom:1px dotted #e5e7eb}
                .line:last-of-type{border-bottom:none}
                .label{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
                .value{font-weight:600;color:#111}
                .section-title{background:linear-gradient(90deg,#ea580c,#f97316);color:#fff;padding:6px 10px;margin:10px -2px 6px;border-radius:6px;font-weight:bold;font-size:14px}
                table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden}
                th{background:#fef3c7;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #f59e0b}
                td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
                tr:last-child td{border-bottom:none}
                .dept{border:1px dashed #d1d5db;margin-top:12px;padding:8px 10px;font-weight:bold;border-radius:6px;background:#f9fafb;text-align:center;font-size:12px}
            </style>
            </head><body>
            <div class="box">
                <div class="header">🆕 NEW ORDER</div>
                <div class="line">📦 <span class="label">Order type</span><br><span class="value">${escape(d.orderType)}</span></div>
                <div class="line">🔖 <span class="label">Ref of order no</span><br><span class="value">(REF# ORD-${d.orderId})</span></div>
                <div class="line">🎫 <span class="label">TOKEN #</span><br><span class="value">${d.orderId}</span></div>
                <div class="line">👤 <span class="label">Customer</span><br><span class="value">${escape(d.customer) || '-'}</span></div>
                <div class="line">👨‍💼 <span class="label">Order taker</span><br><span class="value">${escape(d.orderTaker) || '-'}</span></div>
                <div class="line">⏰ <span class="label">Order time</span><br><span class="value">${fmt(d.orderTime)}</span></div>
                <div class="line">🖨️ <span class="label">Print time</span><br><span class="value">${fmt(printTime)}</span></div>
            </div>
            <div class="section-title">🍳 Kitchen</div>
            <table><thead><tr><th style="width:70%">DESCRIPTION</th><th style="text-align:right;width:30%">QTY</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="dept">📂 Other Departments</div>
            </body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 250);
        closeKitchenReceiptAndOrder();
    };

    // Global keyboard handler
    const handleModalKeyDown = (e: React.KeyboardEvent) => {
        const orderTypes: ('Dine-in' | 'Takeaway' | 'Delivery')[] = ['Dine-in', 'Takeaway', 'Delivery'];
        const currentTypeIndex = orderTypes.indexOf(orderType);
        const suggestions = getCurrentSuggestions();

        // LEFT/RIGHT for order type tabs
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const newIndex = Math.max(0, currentTypeIndex - 1);
            setOrderType(orderTypes[newIndex]);
            setActiveFieldIndex(0);
            setIsDropdownActive(false);
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const newIndex = Math.min(orderTypes.length - 1, currentTypeIndex + 1);
            setOrderType(orderTypes[newIndex]);
            setActiveFieldIndex(0);
            setIsDropdownActive(false);
            return;
        }

        // DOWN ARROW
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (isDropdownActive && suggestions.length > 0) {
                // Navigate within dropdown
                setHighlightIndex(Math.min(highlightIndex + 1, suggestions.length - 1));
            } else {
                // Move to next field
                setActiveFieldIndex(Math.min(activeFieldIndex + 1, fieldList.length - 1));
                setIsDropdownActive(false);
                setHighlightIndex(-1);
            }
            return;
        }

        // UP ARROW
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (isDropdownActive && highlightIndex > 0) {
                // Navigate within dropdown
                setHighlightIndex(highlightIndex - 1);
            } else if (isDropdownActive && highlightIndex <= 0) {
                // Exit dropdown mode
                setIsDropdownActive(false);
                setHighlightIndex(-1);
            } else {
                // Move to previous field
                setActiveFieldIndex(Math.max(0, activeFieldIndex - 1));
            }
            return;
        }

        // ENTER
        if (e.key === 'Enter') {
            e.preventDefault();
            const currentField = fieldList[activeFieldIndex];

            if (isDropdownActive && highlightIndex >= 0 && suggestions[highlightIndex]) {
                // Select highlighted item
                const selected = suggestions[highlightIndex];
                if (currentField === 'name' || currentField === 'phone' || currentField === 'address') {
                    selectCustomer(selected);
                } else if (currentField === 'items') {
                    if (selected.type === 'category') {
                        selectCategory(selected);
                    } else {
                        addToCart(selected);
                    }
                } else if (currentField === 'table') {
                    setSelectedTable(selected.id);
                    setIsDropdownActive(false);
                    setHighlightIndex(-1);
                } else if (currentField === 'waiter') {
                    setSelectedWaiter(selected.id);
                    setIsDropdownActive(false);
                    setHighlightIndex(-1);
                } else if (currentField === 'rider') {
                    setSelectedRider(selected.id);
                    setIsDropdownActive(false);
                    setHighlightIndex(-1);
                }
            } else {
                // Open dropdown
                setIsDropdownActive(true);
                setHighlightIndex(-1);
                // Trigger suggestions fetch for customer fields
                if (currentField === 'name') fetchCustomerSuggestions(customerName);
                if (currentField === 'phone') fetchCustomerSuggestions(customerPhone);
                if (currentField === 'address') fetchCustomerSuggestions(deliveryAddress);
            }
            return;
        }

        // ESCAPE
        if (e.key === 'Escape') {
            if (isDropdownActive) {
                setIsDropdownActive(false);
                setHighlightIndex(-1);
            } else {
                onClose();
            }
            return;
        }
    };

    if (!isOpen) return null;

    const currentField = fieldList[activeFieldIndex];

    // Field component helper
    const renderFieldHighlight = (fieldName: string) => {
        return currentField === fieldName ? 'ring-2 ring-orange-500' : '';
    };

    return (
        <div
            ref={modalRef}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 outline-none"
            onKeyDown={handleModalKeyDown}
            tabIndex={-1}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">New Order</h2>
                    <div className="text-xs text-gray-400">↑↓ Navigate | Enter Open/Select | ←→ Order Type | Esc Close</div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        {/* Order Type Tabs */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
                            <div className="flex gap-2">
                                {(['Dine-in', 'Takeaway', 'Delivery'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => { setOrderType(type); setActiveFieldIndex(0); }}
                                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${orderType === type ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dine-in Fields */}
                        {orderType === 'Dine-in' && (
                            <>
                                {/* Table */}
                                <div className={`p-3 border rounded-lg ${renderFieldHighlight('table')}`}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Table *</label>
                                    <div className="font-medium">{selectedTable ? tables.find(t => t.id === selectedTable)?.table_number || 'Selected' : 'Press Enter to select'}</div>
                                    {currentField === 'table' && isDropdownActive && (
                                        <div className="mt-2 border rounded-lg max-h-40 overflow-auto bg-white shadow">
                                            {tables.map((t, idx) => (
                                                <div
                                                    key={t.id}
                                                    className={`p-2 cursor-pointer ${idx === highlightIndex ? 'bg-orange-100' : 'hover:bg-gray-50'}`}
                                                    onClick={() => { setSelectedTable(t.id); setIsDropdownActive(false); }}
                                                >
                                                    {t.table_number} (Capacity: {t.capacity})
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Waiter */}
                                <div className={`p-3 border rounded-lg ${renderFieldHighlight('waiter')}`}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Waiter</label>
                                    <div className="font-medium">{selectedWaiter ? waiters.find(w => w.id === selectedWaiter)?.name || 'Selected' : 'Press Enter to select'}</div>
                                    {currentField === 'waiter' && isDropdownActive && (
                                        <div className="mt-2 border rounded-lg max-h-40 overflow-auto bg-white shadow">
                                            {waiters.map((w, idx) => (
                                                <div
                                                    key={w.id}
                                                    className={`p-2 cursor-pointer ${idx === highlightIndex ? 'bg-orange-100' : 'hover:bg-gray-50'}`}
                                                    onClick={() => { setSelectedWaiter(w.id); setIsDropdownActive(false); }}
                                                >
                                                    {w.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Takeaway/Delivery Fields */}
                        {(orderType === 'Takeaway' || orderType === 'Delivery') && (
                            <>
                                {/* Customer Name */}
                                <div className={`p-3 border rounded-lg ${renderFieldHighlight('name')}`}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        value={customerName}
                                        onChange={e => { setCustomerName(e.target.value); fetchCustomerSuggestions(e.target.value); }}
                                        onFocus={() => { setActiveFieldIndex(fieldList.indexOf('name')); }}
                                        className="w-full p-2 border border-gray-200 rounded outline-none focus:border-orange-500"
                                        placeholder="Enter customer name"
                                    />
                                    {currentField === 'name' && isDropdownActive && customerSuggestions.length > 0 && (
                                        <div className="mt-2 border rounded-lg max-h-40 overflow-auto bg-white shadow">
                                            {customerSuggestions.map((c, idx) => (
                                                <div
                                                    key={c.id}
                                                    className={`p-2 cursor-pointer ${idx === highlightIndex ? 'bg-orange-100' : 'hover:bg-gray-50'}`}
                                                    onClick={() => selectCustomer(c)}
                                                >
                                                    <div className="font-medium">{c.name}</div>
                                                    <div className="text-xs text-gray-500">{c.phone}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className={`p-3 border rounded-lg ${renderFieldHighlight('phone')}`}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                    <input
                                        ref={phoneInputRef}
                                        type="tel"
                                        value={customerPhone}
                                        onChange={e => { setCustomerPhone(e.target.value); fetchCustomerSuggestions(e.target.value); }}
                                        onFocus={() => { setActiveFieldIndex(fieldList.indexOf('phone')); }}
                                        className="w-full p-2 border border-gray-200 rounded outline-none focus:border-orange-500"
                                        placeholder="03XX-XXXXXXX"
                                    />
                                    {currentField === 'phone' && isDropdownActive && customerSuggestions.length > 0 && (
                                        <div className="mt-2 border rounded-lg max-h-40 overflow-auto bg-white shadow">
                                            {customerSuggestions.map((c, idx) => (
                                                <div
                                                    key={c.id}
                                                    className={`p-2 cursor-pointer ${idx === highlightIndex ? 'bg-orange-100' : 'hover:bg-gray-50'}`}
                                                    onClick={() => selectCustomer(c)}
                                                >
                                                    <div className="font-medium">{c.phone}</div>
                                                    <div className="text-xs text-gray-500">{c.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Address (Delivery only) */}
                                {orderType === 'Delivery' && (
                                    <>
                                        <div className={`p-3 border rounded-lg ${renderFieldHighlight('address')}`}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                            <textarea
                                                ref={addressInputRef}
                                                value={deliveryAddress}
                                                onChange={e => { setDeliveryAddress(e.target.value); fetchCustomerSuggestions(e.target.value); }}
                                                onFocus={() => { setActiveFieldIndex(fieldList.indexOf('address')); }}
                                                className="w-full p-2 border border-gray-200 rounded outline-none focus:border-orange-500"
                                                placeholder="Enter address"
                                                rows={2}
                                            />
                                            {currentField === 'address' && isDropdownActive && customerSuggestions.length > 0 && (
                                                <div className="mt-2 border rounded-lg max-h-40 overflow-auto bg-white shadow">
                                                    {customerSuggestions.map((c, idx) => (
                                                        <div
                                                            key={c.id}
                                                            className={`p-2 cursor-pointer ${idx === highlightIndex ? 'bg-orange-100' : 'hover:bg-gray-50'}`}
                                                            onClick={() => selectCustomer(c)}
                                                        >
                                                            <div className="font-medium">{c.address || 'No address'}</div>
                                                            <div className="text-xs text-gray-500">{c.name} - {c.phone}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3 border rounded-lg">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charges</label>
                                            <input
                                                type="number"
                                                value={deliveryCharges}
                                                onChange={e => setDeliveryCharges(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full p-2 border border-gray-200 rounded outline-none focus:border-orange-500"
                                                placeholder="Enter delivery charges"
                                                min={0}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Rider (Delivery only) */}
                                {orderType === 'Delivery' && (
                                    <div className={`p-3 border rounded-lg ${renderFieldHighlight('rider')}`}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Rider</label>
                                        <div className="font-medium">{selectedRider ? riders.find(r => r.id === selectedRider)?.name || 'Selected' : 'Press Enter to select'}</div>
                                        {currentField === 'rider' && isDropdownActive && (
                                            <div className="mt-2 border rounded-lg max-h-40 overflow-auto bg-white shadow">
                                                {riders.map((r, idx) => (
                                                    <div
                                                        key={r.id}
                                                        className={`p-2 cursor-pointer ${idx === highlightIndex ? 'bg-orange-100' : 'hover:bg-gray-50'}`}
                                                        onClick={() => { setSelectedRider(r.id); setIsDropdownActive(false); }}
                                                    >
                                                        {r.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Item Search */}
                        <div className={`p-3 border rounded-lg ${renderFieldHighlight('items')}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Add Items</label>
                            {selectedCategory && (
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Filtered by: <strong>{categories.find(c => c.id === selectedCategory)?.name}</strong></span>
                                    <button
                                        onClick={clearCategoryFilter}
                                        className="text-xs text-orange-600 hover:text-orange-700 underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={itemsInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setIsDropdownActive(true); setHighlightIndex(-1); }}
                                    onFocus={() => { setActiveFieldIndex(fieldList.indexOf('items')); }}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded outline-none focus:border-orange-500"
                                    placeholder={selectedCategory ? "Search items in category..." : "Search categories or items..."}
                                />
                            </div>
                            {currentField === 'items' && isDropdownActive && searchResults.length > 0 && (
                                <div className="mt-2 border rounded-lg max-h-40 overflow-auto bg-white shadow">
                                    {searchResults.map((result, idx) => (
                                        <div
                                            key={result.type === 'category' ? `cat-${result.id}` : `item-${result.id}`}
                                            className={`p-2 flex justify-between cursor-pointer ${idx === highlightIndex ? 'bg-orange-100' : 'hover:bg-gray-50'}`}
                                            onClick={() => result.type === 'category' ? selectCategory(result) : addToCart(result)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {result.type === 'category' && (
                                                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Category</span>
                                                )}
                                                <span className="font-medium">{result.name}</span>
                                            </div>
                                            {result.type === 'item' && (
                                                <span className="text-orange-600 font-bold">Rs. {Number(result.price).toFixed(0)}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Cart */}
                    <div className="bg-gray-50 rounded-xl p-4 flex flex-col">
                        <h3 className="font-bold text-gray-900 mb-3">Order Items</h3>
                        <div className="flex-1 overflow-auto space-y-2">
                            {cart.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">No items added</p>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-gray-900">{item.name}</span>
                                            <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200">
                                                    <Minus size={14} />
                                                </button>
                                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200">
                                                    <Plus size={14} />
                                                </button>
                                                <span className="text-gray-500">× Rs. {item.unit_price}</span>
                                            </div>
                                            <span className="font-bold">Rs. {(item.unit_price * item.quantity).toFixed(0)}</span>
                                        </div>
                                        <div className="mt-2">
                                            <label className="block text-xs text-gray-500 mb-0.5">Note (for kitchen)</label>
                                            <input
                                                type="text"
                                                value={item.note || ''}
                                                onChange={e => updateNote(item.id, e.target.value)}
                                                placeholder="e.g. no onions, extra cheese"
                                                className="w-full p-1.5 text-sm border border-gray-200 rounded outline-none focus:border-orange-500"
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-sm">
                                            <span className="text-gray-500">Discount:</span>
                                            <input
                                                type="number"
                                                value={item.discount}
                                                onChange={e => updateDiscount(item.id, Number(e.target.value))}
                                                className="w-20 p-1 border border-gray-200 rounded text-right"
                                                min={0}
                                            />
                                            <span className="text-gray-500">Rs.</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Totals */}
                        <div className="border-t border-gray-200 pt-3 mt-3 space-y-3">
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Subtotal</span>
                                    <span>Rs. {subtotal.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>Discount</span>
                                    <span>- Rs. {totalDiscount.toFixed(0)}</span>
                                </div>
                                {orderType === 'Delivery' && Number(deliveryCharges) > 0 && (
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Delivery Charges</span>
                                        <span>+ Rs. {Number(deliveryCharges).toFixed(0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>Rs. {total.toFixed(0)}</span>
                                </div>
                            </div>

                            {/* Payment Method Selection (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Method <span className="text-gray-400 text-xs">(Optional)</span>
                                </label>
                                <select
                                    value={selectedPaymentAccount || ''}
                                    onChange={e => setSelectedPaymentAccount(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-orange-500 text-sm"
                                >
                                    <option value="">Not Paid - Collect Later</option>
                                    {paymentAccounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.payment_method_name} - {account.account_number}
                                            {account.account_label ? ` (${account.account_label})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedPaymentAccount && (
                                    <p className="text-xs text-green-600 mt-1">✓ Payment received in advance - Order will skip payment collection</p>
                                )}
                                {!selectedPaymentAccount && (
                                    <p className="text-xs text-gray-500 mt-1">Payment not received - Will appear in "Pending Payment" when completed</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600">
                        Create Order
                    </button>
                </div>
            </div>

            {/* Kitchen Receipt Modal (after order placed) */}
            {showKitchenReceiptModal && kitchenReceiptData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]" onClick={() => { }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-orange-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b-2 border-dashed border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
                            <h2 className="text-xl font-bold text-gray-900 text-center flex items-center justify-center gap-2">🍳 Kitchen Receipt</h2>
                            <p className="text-sm text-orange-600 mt-1 text-center font-medium">Token #{kitchenReceiptData.orderId}</p>
                        </div>
                        <div className="p-4 max-h-72 overflow-auto bg-gray-50/80">
                            <div className="rounded-xl border-2 border-orange-200 bg-white p-3 mb-3 shadow-sm">
                                <div className="text-center font-bold text-gray-900 mb-3 pb-2 border-b-2 border-dashed border-orange-200">🆕 NEW ORDER</div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-1.5 border-b border-dotted border-gray-200"><span className="text-gray-500">📦 Order type</span><span className="font-medium text-gray-800">{kitchenReceiptData.orderType}</span></div>
                                    <div className="flex justify-between py-1.5 border-b border-dotted border-gray-200"><span className="text-gray-500">🔖 Ref no</span><span className="font-medium">ORD-{kitchenReceiptData.orderId}</span></div>
                                    <div className="flex justify-between py-1.5 border-b border-dotted border-gray-200"><span className="text-gray-500">🎫 TOKEN #</span><span className="font-bold text-orange-600">{kitchenReceiptData.orderId}</span></div>
                                    <div className="flex justify-between py-1.5 border-b border-dotted border-gray-200"><span className="text-gray-500">👤 Customer</span><span className="font-medium">{kitchenReceiptData.customer || '-'}</span></div>
                                    <div className="flex justify-between py-1.5 border-b border-dotted border-gray-200"><span className="text-gray-500">👨‍💼 Order taker</span><span className="font-medium">{kitchenReceiptData.orderTaker || '-'}</span></div>
                                    <div className="flex justify-between py-1.5"><span className="text-gray-500">⏰ Order time</span><span className="font-medium text-gray-700">{kitchenReceiptData.orderTime.toLocaleString()}</span></div>
                                </div>
                            </div>
                            <div className="rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 font-bold text-amber-900 mb-2 flex items-center gap-2">🍳 Kitchen</div>
                            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-amber-50 border-b-2 border-amber-200"><th className="text-left py-2 px-3 text-amber-900 font-semibold">DESCRIPTION</th><th className="text-right py-2 px-3 text-amber-900 font-semibold">QTY</th></tr></thead>
                                    <tbody>
                                        {kitchenReceiptData.items.map((i, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                <td className="py-2 px-3"><span className="font-medium text-gray-800">{i.name}</span>{i.note ? <div className="text-orange-600 text-xs mt-0.5">📝 {i.note}</div> : null}</td>
                                                <td className="py-2 px-3 text-right font-semibold">{i.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 font-semibold text-gray-600 text-center text-xs">📂 Other Departments</div>
                        </div>
                        <div className="p-4 border-t border-gray-100 space-y-2">
                            <p className="text-sm text-gray-600 text-center">Print kitchen receipt?</p>
                            <div className="flex gap-3">
                                <button onClick={closeKitchenReceiptAndOrder} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                                    Don&apos;t Print
                                </button>
                                <button onClick={handlePrintKitchenReceipt} className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 flex items-center justify-center gap-2">
                                    <Printer size={18} /> Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewOrderModal;
