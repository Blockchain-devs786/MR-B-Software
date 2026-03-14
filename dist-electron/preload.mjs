"use strict";
const electron = require("electron");
const api = {
  // Orders
  getOrders: (filters) => electron.ipcRenderer.invoke("get-orders", filters),
  updateOrderStatus: (orderId, status) => electron.ipcRenderer.invoke("update-order-status", { orderId, status }),
  updatePaymentStatus: (orderId, paymentStatus, paymentMethod, paymentType, payments) => electron.ipcRenderer.invoke("update-payment-status", { orderId, paymentStatus, paymentMethod, paymentType, payments }),
  createOrder: (orderData) => electron.ipcRenderer.invoke("create-order", orderData),
  updateOrder: (orderId, orderData) => electron.ipcRenderer.invoke("update-order", orderId, orderData),
  cancelOrder: (orderId, reason) => electron.ipcRenderer.invoke("cancel-order", { orderId, reason }),
  getCustomers: (searchQuery) => electron.ipcRenderer.invoke("get-customers", searchQuery),
  // Tables
  getTables: () => electron.ipcRenderer.invoke("get-tables"),
  getAvailableTables: () => electron.ipcRenderer.invoke("get-available-tables"),
  // Waiters
  getWaiters: () => electron.ipcRenderer.invoke("get-waiters"),
  // Categories
  getCategories: () => electron.ipcRenderer.invoke("get-categories"),
  addCategory: (category) => electron.ipcRenderer.invoke("add-category", category),
  updateCategory: (category) => electron.ipcRenderer.invoke("update-category", category),
  deleteCategory: (id) => electron.ipcRenderer.invoke("delete-category", id),
  // Items
  getItems: () => electron.ipcRenderer.invoke("get-items"),
  getItemsByCategory: (categoryId) => electron.ipcRenderer.invoke("get-items-by-category", categoryId),
  addItem: (item) => electron.ipcRenderer.invoke("add-item", item),
  updateItem: (item) => electron.ipcRenderer.invoke("update-item", item),
  deleteItem: (id) => electron.ipcRenderer.invoke("delete-item", id),
  // Deals
  getDeals: () => electron.ipcRenderer.invoke("get-deals"),
  createDeal: (dealData) => electron.ipcRenderer.invoke("create-deal", dealData),
  updateDeal: (dealId, dealData) => electron.ipcRenderer.invoke("update-deal", { dealId, dealData }),
  deleteDeal: (id) => electron.ipcRenderer.invoke("delete-deal", id),
  toggleDealStatus: (id, isActive) => electron.ipcRenderer.invoke("toggle-deal-status", { id, isActive }),
  // Riders
  getRiders: () => electron.ipcRenderer.invoke("get-riders"),
  getAvailableRiders: () => electron.ipcRenderer.invoke("get-available-riders"),
  addRider: (rider) => electron.ipcRenderer.invoke("add-rider", rider),
  updateRider: (rider) => electron.ipcRenderer.invoke("update-rider", rider),
  deleteRider: (id) => electron.ipcRenderer.invoke("delete-rider", id),
  // Expense Categories
  getExpenseCategories: () => electron.ipcRenderer.invoke("get-expense-categories"),
  addExpenseCategory: (category) => electron.ipcRenderer.invoke("add-expense-category", category),
  updateExpenseCategory: (category) => electron.ipcRenderer.invoke("update-expense-category", category),
  deleteExpenseCategory: (id) => electron.ipcRenderer.invoke("delete-expense-category", id),
  // Expenses
  getExpenses: (filters) => electron.ipcRenderer.invoke("get-expenses", filters),
  addExpense: (expense) => electron.ipcRenderer.invoke("add-expense", expense),
  updateExpense: (expense) => electron.ipcRenderer.invoke("update-expense", expense),
  deleteExpense: (id) => electron.ipcRenderer.invoke("delete-expense", id),
  // Refunds
  getRefunds: () => electron.ipcRenderer.invoke("get-refunds"),
  addRefund: (refund) => electron.ipcRenderer.invoke("add-refund", refund),
  // Other Sales Categories
  getOtherSaleCategories: () => electron.ipcRenderer.invoke("get-other-sale-categories"),
  addOtherSaleCategory: (category) => electron.ipcRenderer.invoke("add-other-sale-category", category),
  updateOtherSaleCategory: (category) => electron.ipcRenderer.invoke("update-other-sale-category", category),
  deleteOtherSaleCategory: (id) => electron.ipcRenderer.invoke("delete-other-sale-category", id),
  // Other Sales
  getOtherSales: (filters) => electron.ipcRenderer.invoke("get-other-sales", filters),
  addOtherSale: (sale) => electron.ipcRenderer.invoke("add-other-sale", sale),
  // Settings
  getSetting: (key) => electron.ipcRenderer.invoke("get-setting", key),
  saveSetting: (key, value) => electron.ipcRenderer.invoke("save-setting", { key, value }),
  // License
  checkLicense: () => electron.ipcRenderer.invoke("check-license"),
  sendLicenseRequest: () => electron.ipcRenderer.invoke("send-license-request"),
  checkLicenseReply: () => electron.ipcRenderer.invoke("check-license-reply"),
  // Payment Methods
  getPaymentMethods: () => electron.ipcRenderer.invoke("get-payment-methods"),
  addPaymentMethod: (method) => electron.ipcRenderer.invoke("add-payment-method", method),
  updatePaymentMethod: (method) => electron.ipcRenderer.invoke("update-payment-method", method),
  deletePaymentMethod: (id) => electron.ipcRenderer.invoke("delete-payment-method", id),
  // Payment Accounts
  getPaymentAccounts: (paymentMethodId) => electron.ipcRenderer.invoke("get-payment-accounts", paymentMethodId),
  getAllPaymentAccounts: () => electron.ipcRenderer.invoke("get-all-payment-accounts"),
  addPaymentAccount: (account) => electron.ipcRenderer.invoke("add-payment-account", account),
  updatePaymentAccount: (account) => electron.ipcRenderer.invoke("update-payment-account", account),
  deletePaymentAccount: (id) => electron.ipcRenderer.invoke("delete-payment-account", id),
  // Registries
  startRegistry: (data) => electron.ipcRenderer.invoke("start-registry", data),
  closeRegistry: (data) => electron.ipcRenderer.invoke("close-registry", data || {}),
  getCurrentRegistry: () => electron.ipcRenderer.invoke("get-current-registry"),
  getRegistries: (filters) => electron.ipcRenderer.invoke("get-registries", filters),
  getRegistrySummary: (registryId) => electron.ipcRenderer.invoke("get-registry-summary", registryId),
  // Auto-Update
  onUpdateAvailable: (callback) => {
    electron.ipcRenderer.on("update-available", (_event, info) => callback(info));
  },
  onUpdateDownloadProgress: (callback) => {
    electron.ipcRenderer.on("update-download-progress", (_event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback) => {
    electron.ipcRenderer.on("update-downloaded", (_event, info) => callback(info));
  },
  installUpdate: () => electron.ipcRenderer.invoke("install-update"),
  getVersion: () => electron.ipcRenderer.invoke("get-version")
};
electron.contextBridge.exposeInMainWorld("api", api);
