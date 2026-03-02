import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Trash2, ChevronDown, Check, Printer, X } from 'lucide-react';
import { useToast } from './Toast';

// Interfaces
interface CartItem {
    id: number;
    name: string;
    unit_price: number;
    quantity: number;
    discount: number;
    note?: string;
}

interface OrderSidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onOrderCreated: () => void;
    cart: CartItem[];
    onUpdateCart: (cart: CartItem[]) => void;
    hasOpenRegistry?: boolean;
    initialOrder?: any | null;
}

// Custom Dropdown Component
const CustomDropdown = ({ label, options, value, onChange, isOpen, onToggle, onNext, autoFocus, id }: any) => {
    const [highlightIndex, setHighlightIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const trigger = containerRef.current.querySelector('[role="button"]') as HTMLElement;
            trigger?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (autoFocus && containerRef.current) {
            // Focus the trigger div
            const trigger = containerRef.current.querySelector('[role="button"]') as HTMLElement;
            trigger?.focus();
        }
    }, [autoFocus]);

    // Reset highlight when opened
    useEffect(() => {
        if (isOpen) {
            setHighlightIndex(0);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isOpen) {
                // Select highlighted
                if (options[highlightIndex]) {
                    onChange(options[highlightIndex].id);
                    onToggle(); // Close
                    onNext(); // Move next
                }
            } else {
                onToggle(); // Open
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) onToggle();
            else setHighlightIndex(prev => Math.min(prev + 1, options.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) onToggle();
            else setHighlightIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Escape') {
            if (isOpen) onToggle();
        } else if (e.key === 'Tab') {
            if (isOpen) onToggle();
        }
    };

    // Determine label
    const selectedOption = options.find((o: any) => o.id === value);

    return (
        <div className="relative" ref={containerRef} id={id}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
            <div
                role="button"
                tabIndex={0}
                className={`w-full p-1 px-2 border rounded flex justify-between items-center bg-white outline-none text-xs h-7 transition-all ${isOpen ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-200 hover:border-gray-300 focus:border-orange-500'}`}
                onClick={onToggle}
                onKeyDown={handleKeyDown}
            >
                <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedOption ? selectedOption.label : `Select ${label}`}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div ref={listRef} className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {options.map((option: any, idx: number) => (
                        <div
                            key={option.id}
                            className={`p-2 flex items-center justify-between cursor-pointer text-sm ${idx === highlightIndex ? 'bg-orange-50 text-orange-900' : 'hover:bg-gray-50 text-gray-700'}`}
                            onClick={() => {
                                onChange(option.id);
                                onToggle();
                                onNext();
                            }}
                        >
                            <span>{option.label}</span>
                            {value === option.id && <Check size={14} className="text-orange-500" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const OrderSidePanel = ({ isOpen, onClose, onOrderCreated, cart, onUpdateCart, hasOpenRegistry = true, initialOrder = null }: OrderSidePanelProps) => {
    const [orderType, setOrderType] = useState<'Dine-in' | 'Takeaway' | 'Delivery'>('Dine-in');
    const [tables, setTables] = useState<any[]>([]);
    const [waiters, setWaiters] = useState<any[]>([]);
    const [riders, setRiders] = useState<any[]>([]);
    const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
    const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<number | null>(null);
    const { showToast } = useToast();

    // Form fields
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [selectedWaiter, setSelectedWaiter] = useState<number | null>(null);
    const [selectedRider, setSelectedRider] = useState<number | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryCharges, setDeliveryCharges] = useState<number | ''>('');

    // State for Custom Navigation
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // 'table', 'waiter', 'rider', 'orderType'
    const [suggestionHighlightIndex, setSuggestionHighlightIndex] = useState(0);

    // Kitchen receipt after place order (token = per-registry sequence). For change order: previousItems + recall layout.
    const [showKitchenReceiptModal, setShowKitchenReceiptModal] = useState(false);
    const [kitchenReceiptData, setKitchenReceiptData] = useState<{
        orderId: number;
        token: number;
        orderType: string;
        customer: string;
        orderTaker: string;
        orderTime: Date;
        items: { name: string; quantity: number; note: string }[];
        previousItems?: { name: string; quantity: number; note: string }[];
    } | null>(null);

    // Customer suggestions
    const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
    const [isDropdownActive, setIsDropdownActive] = useState(false);

    // Refs
    const nameInputRef = useRef<HTMLInputElement>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const addressRef = useRef<HTMLInputElement>(null);
    const deliveryChargesRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (window.api) {
            window.api.getWaiters().then(res => res.success && setWaiters(res.data));
            window.api.getAllPaymentAccounts().then(res => res.success && setPaymentAccounts(res.data || []));
        }
    }, []);

    // Refetch tables/riders when panel opens. When editing an order, load all tables/riders so current selection is in list.
    useEffect(() => {
        if (isOpen && window.api) {
            if (initialOrder) {
                window.api.getTables().then(res => res.success && setTables(res.data || []));
                window.api.getRiders().then(res => res.success && setRiders(res.data || []));
            } else {
                window.api.getAvailableTables().then(res => res.success && setTables(res.data || []));
                window.api.getAvailableRiders().then(res => res.success && setRiders(res.data || []));
            }
        }
    }, [isOpen, initialOrder]);

    // Populate form when opening for edit
    useEffect(() => {
        if (isOpen && initialOrder) {
            setOrderType(initialOrder.type || 'Dine-in');
            setCustomerName(initialOrder.customer_name || '');
            setCustomerPhone(initialOrder.customer_phone || '');
            setDeliveryAddress(initialOrder.delivery_address || '');
            setDeliveryCharges(initialOrder.delivery_charges ? Number(initialOrder.delivery_charges) : '');
            setSelectedTable(initialOrder.table_id ?? null);
            setSelectedWaiter(initialOrder.waiter_id ?? null);
            setSelectedRider(initialOrder.rider_id ?? null);
            setSelectedPaymentAccount(null);
        }
    }, [isOpen, initialOrder]);

    // Fetch customer suggestions
    const fetchCustomerSuggestions = async (query: string) => {
        if (query && query.length >= 1 && window.api) {
            const res = await window.api.getCustomers(query);
            if (res.success && res.data.length > 0) {
                setCustomerSuggestions(res.data.slice(0, 5));
                setIsDropdownActive(true);
                setSuggestionHighlightIndex(0);
            } else {
                setCustomerSuggestions([]);
                setIsDropdownActive(false);
            }
        } else {
            setCustomerSuggestions([]);
            setIsDropdownActive(false);
        }
    };

    const handleCustomerInputKeyDown = (e: React.KeyboardEvent, field: string) => {
        if (isDropdownActive && customerSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestionHighlightIndex(prev => Math.min(prev + 1, customerSuggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestionHighlightIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                selectCustomer(customerSuggestions[suggestionHighlightIndex]);
            } else if (e.key === 'Escape') {
                setIsDropdownActive(false);
            }
        } else if (e.key === 'Enter') {
            // Normal Enter navigation
            e.preventDefault();
            if (field === 'name') phoneInputRef.current?.focus();
            if (field === 'phone') {
                if (orderType === 'Delivery') {
                    addressRef.current?.focus();
                } else if (orderType === 'Takeaway') {
                    // Could focus Submit here if verified
                }
            }
        }
    };

    // Auto-scroll the dropdown when navigating with arrows
    useEffect(() => {
        if (isDropdownActive && customerSuggestions.length > 0) {
            const container = document.getElementById('customer-suggestions');
            const activeItem = document.getElementById(`customer-suggestion-${suggestionHighlightIndex}`);
            if (container && activeItem) {
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;
                const itemTop = activeItem.offsetTop;
                const itemBottom = itemTop + activeItem.clientHeight;

                if (itemBottom > containerBottom) {
                    // Item is below visible area
                    container.scrollTop = itemBottom - container.clientHeight;
                } else if (itemTop < containerTop) {
                    // Item is above visible area
                    container.scrollTop = itemTop;
                }
            }
        }
    }, [suggestionHighlightIndex, isDropdownActive, customerSuggestions.length]);

    const selectCustomer = (customer: any) => {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone || '');
        setDeliveryAddress(customer.address || '');
        setIsDropdownActive(false);
        // Navigate to next valid field
        if (orderType === 'Takeaway') phoneInputRef.current?.focus();
        else if (orderType === 'Delivery') phoneInputRef.current?.focus();
    };

    // Auto Focus Order Type when panel opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                const dropdown = document.getElementById('order-type-dropdown');
                const trigger = dropdown?.querySelector('[role="button"]') as HTMLElement;
                trigger?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const updateQuantity = (id: number, delta: number) => {
        onUpdateCart(cart.map(c => c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
    };

    const updateNote = (id: number, note: string) => {
        onUpdateCart(cart.map(c => c.id === id ? { ...c, note } : c));
    };

    const updateDiscount = (id: number, discount: number) => {
        onUpdateCart(cart.map(c => c.id === id ? { ...c, discount: Math.max(0, discount) } : c));
    };

    const removeFromCart = (id: number) => {
        onUpdateCart(cart.filter(c => c.id !== id));
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const total = subtotal - totalDiscount + (orderType === 'Delivery' ? (Number(deliveryCharges) || 0) : 0);

    const handleSubmit = async () => {
        if (!window.api) return;
        if (!hasOpenRegistry) {
            showToast('Start a registry to place orders.');
            return;
        }

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

        const orderData: any = {
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
        if (initialOrder?.id) {
            orderData.service_charges = Number(initialOrder.service_charges || 0);
            orderData.gst = Number(initialOrder.gst || 0);
        }

        const isEdit = !!initialOrder?.id;
        const res = isEdit
            ? await window.api.updateOrder(initialOrder.id, orderData)
            : await window.api.createOrder(orderData);

        if (res.success && res.orderId) {
            const orderTime = new Date();
            const customer = orderType === 'Dine-in'
                ? (tables.find(t => t.id === selectedTable) ? `Table ${tables.find(t => t.id === selectedTable)!.table_number}` : '')
                : (customerName || '');
            const orderTaker = orderType === 'Dine-in' ? (waiters.find(w => w.id === selectedWaiter)?.name || '') : '';
            const token = (res as any).token ?? res.orderId;
            const previousItems = (res as any).previousItems;
            setKitchenReceiptData({
                orderId: res.orderId,
                token,
                orderType,
                customer,
                orderTaker,
                orderTime,
                items: cart.map(i => ({ name: i.name, quantity: i.quantity, note: (i.note || '').trim() })),
                ...(previousItems && previousItems.length > 0 ? { previousItems } : {})
            });
            setShowKitchenReceiptModal(true);
        } else {
            showToast((res.error || 'Failed to save order') as string);
        }
    };

    const closeKitchenReceiptAndOrder = () => {
        setShowKitchenReceiptModal(false);
        setKitchenReceiptData(null);
        setCustomerName('');
        setCustomerPhone('');
        setDeliveryAddress('');
        setDeliveryCharges('');
        setSelectedTable(null);
        setSelectedWaiter(null);
        setSelectedRider(null);
        setSelectedPaymentAccount(null);
        setOrderType('Dine-in');
        onUpdateCart([]);
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
        const isRecall = d.previousItems && d.previousItems.length > 0;
        const printTime = new Date();
        const fmt = (dt: Date) => {
            const day = dt.getDate().toString().padStart(2, '0');
            const m = (dt.getMonth() + 1).toString().padStart(2, '0');
            const y = dt.getFullYear().toString().slice(-2);
            const h = dt.getHours();
            const ampm = h >= 12 ? 'pm' : 'am';
            const h12 = h % 12 || 12;
            const min = dt.getMinutes().toString().padStart(2, '0');
            const sec = dt.getSeconds().toString().padStart(2, '0');
            return `${day}/${m}/${y} ${h12}:${min}:${sec} ${ampm}`;
        };
        const rows = d.items.map((i: { name: string; quantity: number; note?: string }) =>
            `<tr><td style="padding:6px 10px;vertical-align:top">${escape(i.name)}${i.note ? `<br><span style="color:#c2410c;font-size:11px">${escape(i.note)}</span>` : ''}</td><td style="padding:6px 10px;text-align:right;white-space:nowrap;font-weight:600">${i.quantity}</td></tr>`
        ).join('');
        const cancelledRows = (d.previousItems || []).map((i: { name: string; quantity: number; note?: string }) =>
            `<tr class="cancelled-row"><td style="padding:6px 10px;vertical-align:top">${escape(i.name)}${i.note ? `<br><span style="font-size:11px">${escape(i.note)}</span>` : ''}</td><td style="padding:6px 10px;text-align:right;white-space:nowrap;font-weight:600">${i.quantity}</td></tr>`
        ).join('');
        win.document.write(`
            <!DOCTYPE html>
            <html><head><title>Kitchen - Order ${d.orderId}${isRecall ? ' (RECALL)' : ''}</title>
            <style>
                body{font-family:Arial, sans-serif;padding:4mm;font-size:14px;max-width:80mm;margin:0 auto;color:black;}
                .box{border:2px solid #ea580c;border-radius:8px;padding:12px;margin-bottom:10px;background:#fffbf7}
                .header{text-align:center;font-weight:800;font-size:18px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px dashed #ea580c;letter-spacing:0.5px}
                .recall-header{text-align:center;font-weight:800;font-size:16px;margin-bottom:8px;color:#ea580c}
                .line{padding:3px 0;border-bottom:1px dotted #e5e7eb}
                .line:last-of-type{border-bottom:none}
                .label{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
                .value{font-weight:600;color:#111}
                .section-title{background:linear-gradient(90deg,#ea580c,#f97316);color:#fff;padding:6px 10px;margin:10px -2px 6px;border-radius:6px;font-weight:bold;font-size:14px}
                .cancelled-title{background:#6b7280;color:#fff;padding:6px 10px;margin:10px 0 6px;border-radius:6px;font-weight:bold;font-size:13px;text-align:center}
                table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden}
                th{background:#fef3c7;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #f59e0b}
                td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
                tr:last-child td{border-bottom:none}
                .cancelled-section{border:2px solid #9ca3af;border-radius:8px;padding:10px;margin-top:12px;background:#f3f4f6;position:relative}
                .cancelled-row td{text-decoration:line-through;color:#6b7280 !important;}
                .dept{border:1px dashed #d1d5db;margin-top:12px;padding:8px 10px;font-weight:bold;border-radius:6px;background:#f9fafb;text-align:center;font-size:12px}
            </style>
            </head><body>
            ${isRecall ? '<div class="recall-header">RECALL</div>' : ''}
            <div class="box">
                <div class="header">${isRecall ? 'UPDATED ORDER' : 'NEW ORDER'}</div>
                <div class="line"><span class="label">TOKEN #</span><br><span class="value">${d.token ?? d.orderId}</span></div>
                <div class="line"><span class="label">Order time</span><br><span class="value">${fmt(d.orderTime)}</span></div>
                <div class="line"><span class="label">Print time</span><br><span class="value">${fmt(printTime)}</span></div>
            </div>
            <div class="section-title">Kitchen</div>
            <table><thead><tr><th style="width:70%">DESCRIPTION</th><th style="text-align:right;width:30%">QTY</th></tr></thead><tbody>${rows}</tbody></table>
            ${isRecall && cancelledRows ? `
            <div class="cancelled-title">CANCELLED ITEMS</div>
            <div class="cancelled-section">
                <table><thead><tr><th style="width:70%">DESCRIPTION</th><th style="text-align:right;width:30%">QTY</th></tr></thead><tbody>${cancelledRows}</tbody></table>
            </div>
            ` : ''}
            <div class="dept">Other Departments</div>
            </body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 250);
        closeKitchenReceiptAndOrder();
    };

    if (!isOpen) return null;

    return (
        <div className="w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col h-screen fixed right-0 top-0 bottom-0 z-30 transition-transform duration-300 transform translate-x-0">
            {/* Header */}
            <div className="flex items-center justify-between p-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
                <h2 className="text-base font-bold text-gray-900">{initialOrder ? 'Change Order' : 'New Order'}</h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded transition-colors">
                    <X size={18} className="text-gray-500" />
                </button>
            </div>

            {!hasOpenRegistry && (
                <div className="mx-4 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    Start a registry to place orders.
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Form Fields - Compact Grid */}
                <div className="shrink-0 p-2 space-y-2 bg-white border-b border-gray-100 mb-1">

                    {/* Row 1: Order Type + Primary Fields */}
                    <div className="flex items-start gap-2">
                        {/* Order Type (Always present) */}
                        <div className="flex-1">
                            <CustomDropdown
                                label="Order Type"
                                options={[
                                    { id: 'Dine-in', label: 'Dine-in' },
                                    { id: 'Takeaway', label: 'Takeaway' },
                                    { id: 'Delivery', label: 'Delivery' }
                                ]}
                                value={orderType}
                                onChange={(val: any) => {
                                    setOrderType(val);
                                    setTimeout(() => {
                                        if (val === 'Dine-in') {
                                            setActiveDropdown('table');
                                        } else {
                                            setActiveDropdown(null);
                                            if (nameInputRef.current) nameInputRef.current.focus();
                                        }
                                    }, 50);
                                }}
                                isOpen={activeDropdown === 'orderType'}
                                onToggle={() => setActiveDropdown(activeDropdown === 'orderType' ? null : 'orderType')}
                                onNext={() => { }}
                                id="order-type-dropdown"
                            />
                        </div>

                        {/* Dine-in Primary Fields */}
                        {orderType === 'Dine-in' && (
                            <>
                                <div className="flex-1">
                                    <CustomDropdown
                                        label="Table"
                                        options={tables.map(t => ({ id: t.id, label: `${t.table_number}` }))}
                                        value={selectedTable}
                                        onChange={setSelectedTable}
                                        isOpen={activeDropdown === 'table'}
                                        onToggle={() => setActiveDropdown(activeDropdown === 'table' ? null : 'table')}
                                        onNext={() => setActiveDropdown('waiter')}
                                        id="table-dropdown"
                                    />
                                </div>
                                <div className="flex-1">
                                    <CustomDropdown
                                        label="Waiter"
                                        options={waiters.map(w => ({ id: w.id, label: w.name }))}
                                        value={selectedWaiter}
                                        onChange={setSelectedWaiter}
                                        isOpen={activeDropdown === 'waiter'}
                                        onToggle={() => setActiveDropdown(activeDropdown === 'waiter' ? null : 'waiter')}
                                        onNext={() => { setActiveDropdown(null); }}
                                        id="waiter-dropdown"
                                    />
                                </div>
                            </>
                        )}

                        {/* Takeaway / Delivery Primary Fields */}
                        {(orderType === 'Takeaway' || orderType === 'Delivery') && (
                            <>
                                <div className="relative flex-[1.5]">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Customer Name</label>
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        value={customerName}
                                        onChange={e => { setCustomerName(e.target.value); fetchCustomerSuggestions(e.target.value); }}
                                        onKeyDown={e => handleCustomerInputKeyDown(e, 'name')}
                                        className="w-full p-1 border border-gray-200 rounded focus:border-orange-500 outline-none text-xs h-7"
                                        placeholder="Name"
                                    />
                                    {isDropdownActive && customerSuggestions.length > 0 && (
                                        <div id="customer-suggestions" className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-40 overflow-auto">
                                            {customerSuggestions.map((c, idx) => (
                                                <div
                                                    key={c.id}
                                                    id={`customer-suggestion-${idx}`}
                                                    className={`p-2 cursor-pointer text-sm ${idx === suggestionHighlightIndex ? 'bg-orange-100' : 'hover:bg-orange-50'}`}
                                                    onClick={() => selectCustomer(c)}
                                                >
                                                    <div className="font-medium">{c.name}</div>
                                                    <div className="text-xs text-gray-400">{c.phone}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                                    <input
                                        ref={phoneInputRef}
                                        type="text"
                                        value={customerPhone}
                                        onChange={e => { setCustomerPhone(e.target.value); fetchCustomerSuggestions(e.target.value); }}
                                        onKeyDown={e => handleCustomerInputKeyDown(e, 'phone')}
                                        className="w-full p-1 border border-gray-200 rounded focus:border-orange-500 outline-none text-xs h-7"
                                        placeholder="Phone"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Row 2: Delivery Specific Fields */}
                    {orderType === 'Delivery' && (
                        <div className="flex items-start gap-2">
                            <div className="flex-[1.5]">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</label>
                                <input
                                    ref={addressRef as any}
                                    value={deliveryAddress}
                                    onChange={e => setDeliveryAddress(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (deliveryChargesRef.current) deliveryChargesRef.current.focus();
                                        }
                                    }}
                                    className="w-full p-1 border border-gray-200 rounded focus:border-orange-500 outline-none text-xs h-7"
                                    placeholder="Address"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Charges</label>
                                <input
                                    ref={deliveryChargesRef}
                                    type="number"
                                    value={deliveryCharges}
                                    onChange={e => setDeliveryCharges(e.target.value === '' ? '' : Number(e.target.value))}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setActiveDropdown('rider');
                                            setTimeout(() => {
                                                const dropdown = document.getElementById('rider-dropdown');
                                                const trigger = dropdown?.querySelector('[role="button"]') as HTMLElement;
                                                trigger?.focus();
                                            }, 50);
                                        }
                                    }}
                                    className="w-full p-1 border border-gray-200 rounded focus:border-orange-500 outline-none text-xs h-7"
                                    placeholder="Amount"
                                    min={0}
                                />
                            </div>
                            <div className="flex-1">
                                <CustomDropdown
                                    label="Rider"
                                    options={riders.map(r => ({ id: r.id, label: r.name }))}
                                    value={selectedRider}
                                    onChange={setSelectedRider}
                                    isOpen={activeDropdown === 'rider'}
                                    onToggle={() => setActiveDropdown(activeDropdown === 'rider' ? null : 'rider')}
                                    onNext={() => setActiveDropdown(null)}
                                    id="rider-dropdown"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                    <h3 className="font-bold text-gray-900 text-sm">Order Items</h3>
                    {cart.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm">Cart is empty</p>
                            <p className="text-xs text-gray-300 mt-1">Use search bar to add items</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cart.map(item => (
                                <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-1.5 shadow-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-gray-800 text-sm leading-tight">{item.name}</span>
                                        <span className="font-bold text-gray-900 text-sm">Rs. {Number(item.unit_price * item.quantity).toFixed(0)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={item.note || ''}
                                                onChange={e => updateNote(item.id, e.target.value)}
                                                placeholder="Note for kitchen"
                                                className="w-full p-1 text-xs border border-gray-200 rounded outline-none focus:border-orange-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <span>Disc:</span>
                                            <input
                                                type="number"
                                                value={item.discount ?? 0}
                                                onChange={e => updateDiscount(item.id, Number(e.target.value))}
                                                className="w-12 p-0.5 border border-gray-200 rounded text-center"
                                                min={0}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 bg-gray-50 rounded border border-gray-200 p-0.5">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-0.5 hover:bg-gray-200 text-gray-600 rounded">
                                                    <Minus size={12} />
                                                </button>
                                                <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="p-0.5 hover:bg-gray-200 text-gray-600 rounded">
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 p-2 px-3 border-t border-gray-100 bg-white space-y-2">
                <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span>Rs. {subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                        <span>Discount</span>
                        <span>- Rs. {totalDiscount.toFixed(0)}</span>
                    </div>
                    {orderType === 'Delivery' && Number(deliveryCharges) > 0 && (
                        <div className="flex justify-between text-gray-500">
                            <span>Delivery Charges</span>
                            <span>+ Rs. {Number(deliveryCharges).toFixed(0)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-50 mt-1">
                        <span>Total</span>
                        <span>Rs. {total.toFixed(0)}</span>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm transition-all shadow shadow-orange-200 flex items-center justify-center gap-2"
                >
                    {initialOrder ? 'Update Order' : 'Place Order'}
                </button>
            </div>

            {/* Kitchen Receipt Modal (after order placed) */}
            {showKitchenReceiptModal && kitchenReceiptData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-orange-200">
                        <div className="p-4 border-b-2 border-dashed border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
                            <h2 className="text-xl font-bold text-gray-900 text-center flex items-center justify-center gap-2">Kitchen Receipt</h2>
                            {kitchenReceiptData.previousItems && kitchenReceiptData.previousItems.length > 0 && (
                                <p className="text-sm font-bold text-orange-600 mt-1 text-center">RECALL</p>
                            )}
                            <p className="text-sm text-orange-600 mt-1 text-center font-medium">Token #{kitchenReceiptData.token ?? kitchenReceiptData.orderId}</p>
                        </div>
                        <div className="p-4 max-h-72 overflow-auto bg-gray-50/80">
                            <div className="rounded-xl border-2 border-orange-200 bg-white p-3 mb-3 shadow-sm">
                                <div className="text-center font-bold text-gray-900 mb-3 pb-2 border-b-2 border-dashed border-orange-200">
                                    {kitchenReceiptData.previousItems?.length ? 'UPDATED ORDER' : 'NEW ORDER'}
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-1.5 border-b border-dotted border-gray-200"><span className="text-gray-500">TOKEN #</span><span className="font-bold text-orange-600">{kitchenReceiptData.token ?? kitchenReceiptData.orderId}</span></div>
                                    <div className="flex justify-between py-1.5 border-b border-dotted border-gray-200"><span className="text-gray-500">Order time</span><span className="font-medium text-gray-700">{kitchenReceiptData.orderTime.toLocaleString()}</span></div>
                                    <div className="flex justify-between py-1.5"><span className="text-gray-500">Print time</span><span className="font-medium text-gray-700">{new Date().toLocaleString()}</span></div>
                                </div>
                            </div>
                            <div className="rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 font-bold text-amber-900 mb-2">Kitchen</div>
                            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-amber-50 border-b-2 border-amber-200"><th className="text-left py-2 px-3 text-amber-900 font-semibold">DESCRIPTION</th><th className="text-right py-2 px-3 text-amber-900 font-semibold">QTY</th></tr></thead>
                                    <tbody>
                                        {kitchenReceiptData.items.map((i, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                <td className="py-2 px-3"><span className="font-medium text-gray-800">{i.name}</span>{i.note ? <div className="text-orange-600 text-xs mt-0.5">{i.note}</div> : null}</td>
                                                <td className="py-2 px-3 text-right font-semibold">{i.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {kitchenReceiptData.previousItems && kitchenReceiptData.previousItems.length > 0 && (
                                <>
                                    <div className="mt-3 rounded-lg bg-gray-500 text-white px-3 py-2 font-bold text-center text-sm">CANCELLED ITEMS</div>
                                    <div className="rounded-lg border-2 border-gray-400 bg-gray-100 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead><tr className="bg-gray-200 border-b border-gray-400"><th className="text-left py-2 px-3 text-gray-700 font-semibold">DESCRIPTION</th><th className="text-right py-2 px-3 text-gray-700 font-semibold">QTY</th></tr></thead>
                                            <tbody>
                                                {kitchenReceiptData.previousItems.map((i, idx) => (
                                                    <tr key={idx} className="border-b border-gray-300 last:border-0">
                                                        <td className="py-2 px-3 line-through text-gray-500"><span>{i.name}</span>{i.note ? <div className="text-xs mt-0.5">{i.note}</div> : null}</td>
                                                        <td className="py-2 px-3 text-right font-semibold line-through text-gray-500">{i.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                            <div className="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 font-semibold text-gray-600 text-center text-xs">Other Departments</div>
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

export default OrderSidePanel;
