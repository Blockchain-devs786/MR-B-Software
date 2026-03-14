import { ipcRenderer, contextBridge } from 'electron'

const api = {
  // Orders
  getOrders: (filters?: any) => ipcRenderer.invoke('get-orders', filters),
  updateOrderStatus: (orderId: number, status: string) => ipcRenderer.invoke('update-order-status', { orderId, status }),
  updatePaymentStatus: (orderId: number, paymentStatus: string, paymentMethod?: string, paymentType?: string, payments?: { type: string, account_id: number | null, amount: number }[]) => ipcRenderer.invoke('update-payment-status', { orderId, paymentStatus, paymentMethod, paymentType, payments }),
  createOrder: (orderData: any) => ipcRenderer.invoke('create-order', orderData),
  updateOrder: (orderId: number, orderData: any) => ipcRenderer.invoke('update-order', orderId, orderData),
  cancelOrder: (orderId: number, reason: string) => ipcRenderer.invoke('cancel-order', { orderId, reason }),
  getCustomers: (searchQuery?: string) => ipcRenderer.invoke('get-customers', searchQuery),

  // Tables
  getTables: () => ipcRenderer.invoke('get-tables'),
  getAvailableTables: () => ipcRenderer.invoke('get-available-tables'),

  // Waiters
  getWaiters: () => ipcRenderer.invoke('get-waiters'),

  // Categories
  getCategories: () => ipcRenderer.invoke('get-categories'),
  addCategory: (category: any) => ipcRenderer.invoke('add-category', category),
  updateCategory: (category: any) => ipcRenderer.invoke('update-category', category),
  deleteCategory: (id: number) => ipcRenderer.invoke('delete-category', id),

  // Items
  getItems: () => ipcRenderer.invoke('get-items'),
  getItemsByCategory: (categoryId: number) => ipcRenderer.invoke('get-items-by-category', categoryId),
  addItem: (item: any) => ipcRenderer.invoke('add-item', item),
  updateItem: (item: any) => ipcRenderer.invoke('update-item', item),
  deleteItem: (id: number) => ipcRenderer.invoke('delete-item', id),

  // Deals
  getDeals: () => ipcRenderer.invoke('get-deals'),
  createDeal: (dealData: any) => ipcRenderer.invoke('create-deal', dealData),
  updateDeal: (dealId: number, dealData: any) => ipcRenderer.invoke('update-deal', { dealId, dealData }),
  deleteDeal: (id: number) => ipcRenderer.invoke('delete-deal', id),
  toggleDealStatus: (id: number, isActive: boolean) => ipcRenderer.invoke('toggle-deal-status', { id, isActive }),

  // Riders
  getRiders: () => ipcRenderer.invoke('get-riders'),
  getAvailableRiders: () => ipcRenderer.invoke('get-available-riders'),
  addRider: (rider: any) => ipcRenderer.invoke('add-rider', rider),
  updateRider: (rider: any) => ipcRenderer.invoke('update-rider', rider),
  deleteRider: (id: number) => ipcRenderer.invoke('delete-rider', id),

  // Expense Categories
  getExpenseCategories: () => ipcRenderer.invoke('get-expense-categories'),
  addExpenseCategory: (category: any) => ipcRenderer.invoke('add-expense-category', category),
  updateExpenseCategory: (category: any) => ipcRenderer.invoke('update-expense-category', category),
  deleteExpenseCategory: (id: number) => ipcRenderer.invoke('delete-expense-category', id),

  // Expenses
  getExpenses: (filters?: { registryId?: number | null }) => ipcRenderer.invoke('get-expenses', filters),
  addExpense: (expense: any) => ipcRenderer.invoke('add-expense', expense),
  updateExpense: (expense: any) => ipcRenderer.invoke('update-expense', expense),
  deleteExpense: (id: number) => ipcRenderer.invoke('delete-expense', id),

  // Refunds
  getRefunds: () => ipcRenderer.invoke('get-refunds'),
  addRefund: (refund: any) => ipcRenderer.invoke('add-refund', refund),

  // Other Sales Categories
  getOtherSaleCategories: () => ipcRenderer.invoke('get-other-sale-categories'),
  addOtherSaleCategory: (category: any) => ipcRenderer.invoke('add-other-sale-category', category),
  updateOtherSaleCategory: (category: any) => ipcRenderer.invoke('update-other-sale-category', category),
  deleteOtherSaleCategory: (id: number) => ipcRenderer.invoke('delete-other-sale-category', id),

  // Other Sales
  getOtherSales: (filters?: { registryId?: number | null }) => ipcRenderer.invoke('get-other-sales', filters),
  addOtherSale: (sale: any) => ipcRenderer.invoke('add-other-sale', sale),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  saveSetting: (key: string, value: string) => ipcRenderer.invoke('save-setting', { key, value }),

  // License
  checkLicense: () => ipcRenderer.invoke('check-license'),
  sendLicenseRequest: () => ipcRenderer.invoke('send-license-request'),
  checkLicenseReply: () => ipcRenderer.invoke('check-license-reply'),

  // Payment Methods
  getPaymentMethods: () => ipcRenderer.invoke('get-payment-methods'),
  addPaymentMethod: (method: any) => ipcRenderer.invoke('add-payment-method', method),
  updatePaymentMethod: (method: any) => ipcRenderer.invoke('update-payment-method', method),
  deletePaymentMethod: (id: number) => ipcRenderer.invoke('delete-payment-method', id),

  // Payment Accounts
  getPaymentAccounts: (paymentMethodId: number) => ipcRenderer.invoke('get-payment-accounts', paymentMethodId),
  getAllPaymentAccounts: () => ipcRenderer.invoke('get-all-payment-accounts'),
  addPaymentAccount: (account: any) => ipcRenderer.invoke('add-payment-account', account),
  updatePaymentAccount: (account: any) => ipcRenderer.invoke('update-payment-account', account),
  deletePaymentAccount: (id: number) => ipcRenderer.invoke('delete-payment-account', id),

  // Registries
  startRegistry: (data: { opening_cash: number }) => ipcRenderer.invoke('start-registry', data),
  closeRegistry: (data?: { closing_cash?: number }) => ipcRenderer.invoke('close-registry', data || {}),
  getCurrentRegistry: () => ipcRenderer.invoke('get-current-registry'),
  getRegistries: (filters?: { startDate?: string; endDate?: string }) => ipcRenderer.invoke('get-registries', filters),
  getRegistrySummary: (registryId: number) => ipcRenderer.invoke('get-registry-summary', registryId),

  // Auto-Update
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onUpdateDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getVersion: () => ipcRenderer.invoke('get-version'),
}

contextBridge.exposeInMainWorld('api', api)

