/// <reference types="vite/client" />

interface OrderItem {
    id: number;
    item_id: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    price: number;
    discount: number;
    line_total: number;
}

interface Order {
    id: number;
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    table_id: number;
    table_number: string;
    waiter_id: number;
    waiter_name: string;
    rider_id: number;
    rider_name: string;
    type: 'Dine-in' | 'Takeaway' | 'Delivery';
    status: 'Pending' | 'Preparing' | 'Ready' | 'Completed' | 'Refunded' | 'Cancelled';
    payment_status: 'Pending' | 'Paid';
    payment_method: string;
    payment_type: 'Cash' | 'Credit' | 'Bank Transfer' | 'Card' | 'Other';
    registry_id: number | null;
    subtotal: number;
    discount: number;
    service_charges: number;
    gst: number;
    total: number;
    cancel_reason: string | null;
    remarks: string;
    created_at: string;
    items?: OrderItem[];
}

interface Registry {
    id: number;
    start_time: string;
    end_time: string | null;
    opening_cash: number;
    closing_cash: number;
    closing_cash_after_expense: number;
    status: 'Open' | 'Closed';
    created_at: string;
    updated_at: string;
}

interface TableInfo {
    id: number;
    table_number: string;
    capacity: number;
    status: 'Available' | 'Occupied';
}

interface Waiter {
    id: number;
    name: string;
}

interface Rider {
    id: number;
    name: string;
    phone: string;
    status: 'Available' | 'Busy' | 'Offline';
}

interface Category {
    id: number;
    name: string;
    created_at: string;
}

interface Customer {
    id: number;
    name: string;
    phone: string;
    address: string;
    created_at: string;
}

interface PaymentMethod {
    id: number;
    name: string;
    account_count?: number;
    created_at: string;
}

interface PaymentAccount {
    id: number;
    payment_method_id: number;
    payment_method_name?: string;
    account_number: string;
    account_label: string | null;
    is_active: boolean;
    created_at: string;
}

interface Item {
    id: number;
    name: string;
    price: number;
    category_id: number | null;
    category_name?: string;
    is_available: boolean;
}

interface Window {
    api: {
        // Orders
        getOrders: (filters?: any) => Promise<{ success: boolean; data: Order[]; error?: string }>;
        updateOrderStatus: (orderId: number, status: string) => Promise<{ success: boolean; error?: string }>;
        updatePaymentStatus: (orderId: number, paymentStatus: string, paymentMethod?: string, paymentType?: string, payments?: any[]) => Promise<{ success: boolean; error?: string }>;
        createOrder: (orderData: any) => Promise<{ success: boolean; orderId?: number; token?: number; error?: string }>;
        updateOrder: (orderId: number, orderData: any) => Promise<{ success: boolean; orderId?: number; token?: number; previousItems?: { name: string; quantity: number; note: string }[]; error?: string }>;
        cancelOrder: (orderId: number, reason: string) => Promise<{ success: boolean; error?: string }>;
        getCustomers: (searchQuery?: string) => Promise<{ success: boolean; data: Customer[]; error?: string }>;

        // Tables
        getTables: () => Promise<{ success: boolean; data: TableInfo[]; error?: string }>;
        getAvailableTables: () => Promise<{ success: boolean; data: TableInfo[]; error?: string }>;

        // Waiters
        getWaiters: () => Promise<{ success: boolean; data: Waiter[]; error?: string }>;

        // Categories
        getCategories: () => Promise<{ success: boolean; data: Category[]; error?: string }>;
        addCategory: (category: any) => Promise<{ success: boolean; error?: string }>;
        updateCategory: (category: any) => Promise<{ success: boolean; error?: string }>;
        deleteCategory: (id: number) => Promise<{ success: boolean; error?: string }>;

        // Items
        getItems: () => Promise<{ success: boolean; data: Item[]; error?: string }>;
        getItemsByCategory: (categoryId: number) => Promise<{ success: boolean; data: Item[]; error?: string }>;
        addItem: (item: any) => Promise<{ success: boolean; error?: string }>;
        updateItem: (item: any) => Promise<{ success: boolean; error?: string }>;
        deleteItem: (id: number) => Promise<{ success: boolean; error?: string }>;

        // Riders
        getRiders: () => Promise<{ success: boolean; data: Rider[]; error?: string }>;
        getAvailableRiders: () => Promise<{ success: boolean; data: Rider[]; error?: string }>;
        addRider: (rider: any) => Promise<{ success: boolean; error?: string }>;
        updateRider: (rider: any) => Promise<{ success: boolean; error?: string }>;
        deleteRider: (id: number) => Promise<{ success: boolean; error?: string }>;

        // Expense Categories
        getExpenseCategories: () => Promise<{ success: boolean; data: any[]; error?: string }>;
        addExpenseCategory: (category: any) => Promise<{ success: boolean; error?: string }>;
        updateExpenseCategory: (category: any) => Promise<{ success: boolean; error?: string }>;
        deleteExpenseCategory: (id: number) => Promise<{ success: boolean; error?: string }>;

        // Expenses
        getExpenses: (filters?: { registryId?: number | null }) => Promise<{ success: boolean; data: any[]; error?: string }>;
        addExpense: (expense: any) => Promise<{ success: boolean; error?: string }>;
        updateExpense: (expense: any) => Promise<{ success: boolean; error?: string }>;
        deleteExpense: (id: number) => Promise<{ success: boolean; error?: string }>;

        // Refunds
        getRefunds: () => Promise<{ success: boolean; data: any[]; error?: string }>;
        addRefund: (refund: any) => Promise<{ success: boolean; error?: string }>;

        // Settings
        getSetting: (key: string) => Promise<{ success: boolean; value: string; error?: string }>;
        saveSetting: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;

        // License
        checkLicense: () => Promise<{ success: boolean; valid: boolean; license?: any; error?: string }>;
        sendLicenseRequest: () => Promise<{ success: boolean; error?: string }>;
        checkLicenseReply: () => Promise<{ success: boolean; days?: number; error?: string }>;

        // Payment Methods
        getPaymentMethods: () => Promise<{ success: boolean; data: PaymentMethod[]; error?: string }>;
        addPaymentMethod: (method: any) => Promise<{ success: boolean; error?: string }>;
        updatePaymentMethod: (method: any) => Promise<{ success: boolean; error?: string }>;
        deletePaymentMethod: (id: number) => Promise<{ success: boolean; error?: string }>;

        // Payment Accounts
        getPaymentAccounts: (paymentMethodId: number) => Promise<{ success: boolean; data: PaymentAccount[]; error?: string }>;
        getAllPaymentAccounts: () => Promise<{ success: boolean; data: PaymentAccount[]; error?: string }>;
        addPaymentAccount: (account: any) => Promise<{ success: boolean; error?: string }>;
        updatePaymentAccount: (account: any) => Promise<{ success: boolean; error?: string }>;
        deletePaymentAccount: (id: number) => Promise<{ success: boolean; error?: string }>;

        // Registries
        startRegistry: (data: { opening_cash: number }) => Promise<{ success: boolean; registryId?: number; error?: string }>;
        closeRegistry: (data?: { closing_cash?: number }) => Promise<{ success: boolean; registryId?: number; error?: string }>;
        getCurrentRegistry: () => Promise<{ success: boolean; data: Registry | null; error?: string }>;
        getRegistries: (filters?: { startDate?: string; endDate?: string }) => Promise<{ success: boolean; data: Registry[]; error?: string }>;
        getRegistrySummary: (registryId: number) => Promise<{ success: boolean; data: any; error?: string }>;

        // Auto-Update
        onUpdateAvailable: (callback: (info: any) => void) => void;
        onUpdateDownloadProgress: (callback: (progress: any) => void) => void;
        onUpdateDownloaded: (callback: (info: any) => void) => void;
        installUpdate: () => Promise<void>;
        getVersion: () => Promise<string>;
    };
}
