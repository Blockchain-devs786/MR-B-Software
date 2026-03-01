import { ipcMain } from 'electron';
import { query } from './database';
import { isLicenseValid, getSystemInfo, saveLicenseData, getLicenseData } from './license';
import { sendLicenseRequest, checkLicenseReply } from './emailService';

export function setupIpcHandlers() {
    // ==================== ORDERS ====================
    ipcMain.handle('get-orders', async (_event, filters?: { registryId?: number | null }) => {
        try {
            const registryId = filters?.registryId;
            // When explicitly null or a number: filter by registry. If undefined, return all (e.g. for reports/other).
            let sql = `
        SELECT o.*, 
               t.table_number,
               w.name as waiter_name,
               r.name as rider_name
        FROM orders o
        LEFT JOIN tables_info t ON o.table_id = t.id
        LEFT JOIN waiters w ON o.waiter_id = w.id
        LEFT JOIN riders r ON o.rider_id = r.id
            `;
            const params: any[] = [];
            if (registryId !== undefined && registryId !== null) {
                sql += ' WHERE o.registry_id = ?';
                params.push(registryId);
            }
            sql += ' ORDER BY o.created_at DESC';

            const orders = await query(sql, params) as any[];

            // Get all items and payments (join with items table to ensure item_name is always available)
            const items = await query('SELECT oi.*, COALESCE(oi.item_name, i.name) as item_name FROM order_items oi LEFT JOIN items i ON oi.item_id = i.id') as any[];
            const payments = await query('SELECT * FROM order_payments') as any[];

            // Group items and payments by order_id
            const itemsByOrderId: { [key: number]: any[] } = {};
            items.forEach((item: any) => {
                if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
                itemsByOrderId[item.order_id].push(item);
            });

            const paymentsByOrderId: { [key: number]: any[] } = {};
            payments.forEach((payment: any) => {
                if (!paymentsByOrderId[payment.order_id]) paymentsByOrderId[payment.order_id] = [];
                paymentsByOrderId[payment.order_id].push(payment);
            });

            // Attach items and payments to orders
            const ordersWithDetails = orders.map((order: any) => ({
                ...order,
                items: itemsByOrderId[order.id] || [],
                payments: paymentsByOrderId[order.id] || []
            }));

            return { success: true, data: ordersWithDetails };
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            return { success: false, error: 'Failed to fetch orders' };
        }
    });

    ipcMain.handle('get-order-details', async (_event, orderId: number) => {
        try {
            const sql = `
                SELECT o.*, 
                       t.table_number,
                       w.name as waiter_name,
                       r.name as rider_name
                FROM orders o
                LEFT JOIN tables_info t ON o.table_id = t.id
                LEFT JOIN waiters w ON o.waiter_id = w.id
                LEFT JOIN riders r ON o.rider_id = r.id
                WHERE o.id = ?
            `;
            const orders: any[] = await query(sql, [orderId]) as any[];

            if (orders.length === 0) {
                return { success: false, error: 'Order not found' };
            }

            const order = orders[0];

            // Fetch items (join with items table to ensure item_name is always available)
            const items = await query('SELECT oi.*, COALESCE(oi.item_name, i.name) as item_name FROM order_items oi LEFT JOIN items i ON oi.item_id = i.id WHERE oi.order_id = ?', [orderId]);
            order.items = items;

            // Fetch payments
            const payments = await query('SELECT * FROM order_payments WHERE order_id = ?', [orderId]);
            order.payments = payments || [];

            return { success: true, data: order };
        } catch (error: any) {
            console.error('Error fetching order details:', error);
            return { success: false, error: 'Failed to fetch order details' };
        }
    });

    ipcMain.handle('update-order-status', async (_event, { orderId, status }) => {
        try {
            await query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
            // Free table when order is completed only if payment was already collected (e.g. paid in advance)
            if (status === 'Completed') {
                const [order]: any = await query('SELECT type, table_id, payment_status FROM orders WHERE id = ?', [orderId]) as any[];
                if (order && order.type === 'Dine-in' && order.table_id && order.payment_status === 'Paid') {
                    await query('UPDATE tables_info SET status = ? WHERE id = ?', ['Available', order.table_id]);
                }
            }
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-payment-status', async (_event, { orderId, paymentStatus, paymentMethod, paymentType, payments }) => {
        try {
            await query('UPDATE orders SET payment_status = ?, payment_method = ?, payment_type = ? WHERE id = ?', [paymentStatus, paymentMethod || null, paymentType || null, orderId]);

            if (payments && Array.isArray(payments) && payments.length > 0) {
                // Delete existing payments if any (for updates)
                await query('DELETE FROM order_payments WHERE order_id = ?', [orderId]);

                // Insert new split payments
                for (const payment of payments) {
                    await query(
                        'INSERT INTO order_payments (order_id, payment_type, account_id, amount) VALUES (?, ?, ?, ?)',
                        [orderId, payment.type, payment.account_id || null, payment.amount]
                    );
                }
            }

            // When payment is collected, free up table (Dine-in) or rider (Delivery)
            if (paymentStatus === 'Paid') {
                const [order]: any = await query('SELECT type, table_id, rider_id FROM orders WHERE id = ?', [orderId]) as any[];
                if (order) {
                    if (order.type === 'Dine-in' && order.table_id) {
                        await query('UPDATE tables_info SET status = ? WHERE id = ?', ['Available', order.table_id]);
                    }
                    if (order.type === 'Delivery' && order.rider_id) {
                        await query('UPDATE riders SET status = ? WHERE id = ?', ['Available', order.rider_id]);
                    }
                }
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('cancel-order', async (_event, { orderId, reason }) => {
        try {
            // Get order to free up resources
            const [order]: any = await query('SELECT type, table_id, rider_id FROM orders WHERE id = ?', [orderId]) as any[];
            if (order) {
                if (order.table_id) await query('UPDATE tables_info SET status = ? WHERE id = ?', ['Available', order.table_id]);
                if (order.rider_id) await query('UPDATE riders SET status = ? WHERE id = ?', ['Available', order.rider_id]);
            }
            // Set status to Cancelled instead of deleting
            await query('UPDATE orders SET status = ?, cancel_reason = ? WHERE id = ?', ['Cancelled', reason || 'Cancelled by user', orderId]);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-customers', async (_event, searchQuery) => {
        try {
            let sql = 'SELECT * FROM customers';
            const params: any[] = [];

            if (searchQuery) {
                sql += ' WHERE name LIKE ? OR phone LIKE ? ORDER BY created_at DESC LIMIT 10';
                params.push(`%${searchQuery}%`, `%${searchQuery}%`);
            } else {
                sql += ' ORDER BY created_at DESC';
            }

            const customers = await query(sql, params);
            return { success: true, data: customers };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('get-sales-summary', async (_event, filters: any) => {
        try {
            let sql = `
                SELECT 
                    SUM(total) as total_sales,
                    COUNT(id) as total_orders
                FROM orders 
                WHERE status = 'Completed'
            `;
            const params: any[] = [];

            // Add date filters
            if (filters?.startDate && filters?.endDate) {
                sql += ' AND DATE(created_at) >= ? AND DATE(created_at) <= ?';
                params.push(filters.startDate, filters.endDate);
            }

            const results = await query(sql, params) as any[];
            return { success: true, data: results[0] };
        } catch (error: any) {
            console.error('Error fetching sales summary:', error);
            return { success: false, error: 'Failed to fetch sales summary' };
        }
    });

    ipcMain.handle('create-order', async (_event, orderData) => {
        try {
            const { customer_name, customer_phone, delivery_address, table_id, waiter_id, rider_id, type, items, subtotal, discount, total, payment_method, payment_status, service_charges, gst, delivery_charges, payment_type } = orderData;

            // Get current open registry — block order if none open
            const registries: any = await query('SELECT id FROM registries WHERE status = "Open" ORDER BY start_time DESC LIMIT 1') as any[];
            const registryId = registries && registries.length > 0 ? registries[0].id : null;
            if (!registryId) {
                return { success: false, error: 'No registry is open. Start a registry to place orders.' };
            }

            // Determine payment_type from payment_method if not provided
            let finalPaymentType = payment_type || 'Cash';
            if (!payment_type && payment_method) {
                const method = payment_method.toLowerCase();
                if (method.includes('cash') || method === 'cash') {
                    finalPaymentType = 'Cash';
                } else if (method.includes('credit')) {
                    finalPaymentType = 'Credit';
                } else if (method.includes('bank') || method.includes('transfer')) {
                    finalPaymentType = 'Bank Transfer';
                } else if (method.includes('card')) {
                    finalPaymentType = 'Card';
                } else {
                    finalPaymentType = 'Other';
                }
            }

            // Handle Customer Upsert for Takeaway/Delivery
            if ((type === 'Takeaway' || type === 'Delivery') && (customer_phone || customer_name)) {
                let existingCustomer: any = null;

                // First try to find by phone if provided
                if (customer_phone) {
                    const existingByPhone: any = await query('SELECT * FROM customers WHERE phone = ?', [customer_phone]) as any[];
                    if (existingByPhone && existingByPhone.length > 0) {
                        existingCustomer = existingByPhone[0];
                    }
                }

                // If not found by phone, but name is provided, try to find by name
                if (!existingCustomer && customer_name) {
                    const existingByName: any = await query('SELECT * FROM customers WHERE name = ?', [customer_name]) as any[];
                    if (existingByName && existingByName.length > 0) {
                        existingCustomer = existingByName[0];
                    }
                }

                if (existingCustomer) {
                    // Update existing customer details
                    const newName = customer_name?.trim() || existingCustomer.name;
                    const newPhone = customer_phone?.trim() || existingCustomer.phone;
                    const newAddress = delivery_address?.trim() || existingCustomer.address;

                    await query(
                        'UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?',
                        [newName, newPhone, newAddress, existingCustomer.id]
                    );
                } else {
                    // Create new customer
                    await query(
                        'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)',
                        [customer_name?.trim() || 'Guest', customer_phone?.trim() || '', delivery_address?.trim() || '']
                    );
                }
            }

            // Order always starts as Pending, regardless of payment status
            // If payment is received in advance, payment_status will be 'Paid' but status is still 'Pending'
            const result: any = await query(
                `INSERT INTO orders(customer_name, customer_phone, delivery_address, table_id, waiter_id, rider_id, type, subtotal, discount, total, payment_method, payment_status, payment_type, service_charges, gst, delivery_charges, registry_id, status)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [customer_name, customer_phone, delivery_address, table_id, waiter_id, rider_id, type, subtotal, discount || 0, total, payment_method || 'Pending', payment_status || 'Pending', finalPaymentType, service_charges || 0, gst || 0, delivery_charges || 0, registryId, 'Pending']
            );
            const orderId = result.insertId;

            // Mark table as occupied for dine-in
            if (type === 'Dine-in' && table_id) {
                await query('UPDATE tables_info SET status = ? WHERE id = ?', ['Occupied', table_id]);
            }
            // Mark rider as busy for delivery
            if (type === 'Delivery' && rider_id) {
                await query('UPDATE riders SET status = ? WHERE id = ?', ['Busy', rider_id]);
            }

            for (const item of items) {
                const lineTotal = (item.unit_price * item.quantity) - (item.discount || 0);
                await query(
                    'INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_price, discount, line_total, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [orderId, item.id, item.name, item.quantity, item.unit_price, item.discount || 0, lineTotal, item.note || null]
                );
            }
            // Token = order sequence within this registry (restarts per registry)
            const countResult: any = await query('SELECT COUNT(*) as cnt FROM orders WHERE registry_id = ?', [registryId]) as any[];
            const token = (countResult && countResult[0]) ? countResult[0].cnt : 1;
            return { success: true, orderId, token };
        } catch (error: any) {
            console.error(error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-order', async (_event, orderId: number, orderData: any) => {
        try {
            const { customer_name, customer_phone, delivery_address, table_id, waiter_id, rider_id, type, items, subtotal, discount, total, payment_method, payment_status, service_charges, gst, delivery_charges, payment_type } = orderData;

            const existing: any[] = await query('SELECT * FROM orders WHERE id = ?', [orderId]) as any[];
            if (!existing || existing.length === 0) {
                return { success: false, error: 'Order not found.' };
            }
            const order = existing[0];
            if (order.status === 'Completed' || order.status === 'Cancelled' || order.status === 'Refunded') {
                return { success: false, error: 'Cannot change order that is already completed, cancelled, or refunded.' };
            }

            const registryId = order.registry_id;
            if (!registryId) {
                return { success: false, error: 'Order has no registry.' };
            }

            const oldItems: any[] = await query('SELECT item_name, quantity, note FROM order_items WHERE order_id = ?', [orderId]) as any[];
            const previousItems = (oldItems || []).map((r: any) => ({ name: r.item_name, quantity: r.quantity, note: r.note || '' }));

            const oldTableId = order.table_id;
            const oldRiderId = order.rider_id;

            if (order.type === 'Dine-in' && oldTableId) {
                await query('UPDATE tables_info SET status = ? WHERE id = ?', ['Available', oldTableId]);
            }
            if (order.type === 'Delivery' && oldRiderId) {
                await query('UPDATE riders SET status = ? WHERE id = ?', ['Available', oldRiderId]);
            }

            let finalPaymentType = payment_type || order.payment_type || 'Cash';
            if (!payment_type && payment_method) {
                const method = String(payment_method).toLowerCase();
                if (method.includes('cash')) finalPaymentType = 'Cash';
                else if (method.includes('credit')) finalPaymentType = 'Credit';
                else if (method.includes('bank') || method.includes('transfer')) finalPaymentType = 'Bank Transfer';
                else if (method.includes('card')) finalPaymentType = 'Card';
                else finalPaymentType = 'Other';
            }

            if ((type === 'Takeaway' || type === 'Delivery') && customer_phone) {
                const [existingCustomer]: any = await query('SELECT * FROM customers WHERE phone = ?', [customer_phone]) as any[];
                if (existingCustomer) {
                    await query('UPDATE customers SET name = ?, address = ? WHERE id = ?', [customer_name || existingCustomer.name, delivery_address || existingCustomer.address, existingCustomer.id]);
                } else {
                    await query('INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)', [customer_name, customer_phone, delivery_address]);
                }
            }

            await query(
                `UPDATE orders SET customer_name = ?, customer_phone = ?, delivery_address = ?, table_id = ?, waiter_id = ?, rider_id = ?, type = ?, subtotal = ?, discount = ?, total = ?, payment_method = ?, payment_status = ?, payment_type = ?, service_charges = ?, gst = ?, delivery_charges = ? WHERE id = ? `,
                [customer_name, customer_phone, delivery_address, table_id, waiter_id, rider_id, type, subtotal, discount || 0, total, payment_method || order.payment_method, payment_status || order.payment_status, finalPaymentType, service_charges || 0, gst || 0, delivery_charges || 0, orderId]
            );

            await query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
            for (const item of items) {
                const lineTotal = (item.unit_price * item.quantity) - (item.discount || 0);
                await query(
                    'INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_price, item_discount, line_total, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [orderId, item.id, item.name, item.quantity, item.unit_price, item.discount || 0, lineTotal, item.note || null]
                );
            }

            if (type === 'Dine-in' && table_id) {
                await query('UPDATE tables_info SET status = ? WHERE id = ?', ['Occupied', table_id]);
            }
            if (type === 'Delivery' && rider_id) {
                await query('UPDATE riders SET status = ? WHERE id = ?', ['Busy', rider_id]);
            }

            const tokenResult: any = await query('SELECT COUNT(*) as cnt FROM orders WHERE registry_id = ? AND id <= ?', [registryId, orderId]) as any[];
            const token = (tokenResult && tokenResult[0]) ? tokenResult[0].cnt : 1;

            return { success: true, orderId, token, previousItems };
        } catch (error: any) {
            console.error(error);
            return { success: false, error: error.message };
        }
    });

    // ==================== TABLES ====================
    ipcMain.handle('get-tables', async () => {
        try {
            const tables = await query('SELECT * FROM tables_info ORDER BY table_number');
            return { success: true, data: tables };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('get-available-tables', async () => {
        try {
            const tables = await query("SELECT * FROM tables_info WHERE status = 'Available' ORDER BY table_number");
            return { success: true, data: tables };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // ==================== WAITERS ====================
    ipcMain.handle('get-waiters', async () => {
        try {
            const waiters = await query('SELECT * FROM waiters ORDER BY name');
            return { success: true, data: waiters };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // ==================== CATEGORIES ====================
    ipcMain.handle('get-categories', async () => {
        try {
            const categories = await query('SELECT * FROM categories ORDER BY name');
            return { success: true, data: categories };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('add-category', async (_event, category) => {
        try {
            await query('INSERT INTO categories (name) VALUES (?)', [category.name]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('update-category', async (_event, category) => {
        try {
            await query('UPDATE categories SET name=? WHERE id=?', [category.name, category.id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('delete-category', async (_event, id) => {
        try {
            // Check if category has items
            const items: any = await query('SELECT COUNT(*) as count FROM items WHERE category_id = ?', [id]);
            if (items && items[0] && items[0].count > 0) {
                return { success: false, error: 'Cannot delete category with existing items' };
            }
            await query('DELETE FROM categories WHERE id=?', [id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // ==================== ITEMS ====================
    ipcMain.handle('get-items', async () => {
        try {
            const items = await query(`
                SELECT i.*, c.name as category_name 
                FROM items i 
                LEFT JOIN categories c ON i.category_id = c.id 
                WHERE i.is_available = TRUE 
                ORDER BY c.name, i.name
                `);
            return { success: true, data: items };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('get-order-items', async (_event, orderId) => {
        try {
            const items = await query('SELECT oi.*, COALESCE(oi.item_name, i.name) as item_name FROM order_items oi LEFT JOIN items i ON oi.item_id = i.id WHERE oi.order_id = ?', [orderId]);
            return { success: true, data: items };
        } catch (error: any) {
            console.error('Error fetching order items:', error);
            return { success: false, error: 'Failed to fetch order items' };
        }
    });

    ipcMain.handle('get-items-by-category', async (_event, categoryId) => {
        try {
            const items = await query(`
                SELECT i.*, c.name as category_name 
                FROM items i 
                LEFT JOIN categories c ON i.category_id = c.id 
                WHERE i.is_available = TRUE AND i.category_id = ?
                ORDER BY i.name
                    `, [categoryId]);
            return { success: true, data: items };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('add-item', async (_event, item) => {
        try {
            await query('INSERT INTO items (name, price, category_id, is_available) VALUES (?, ?, ?, ?)', [item.name, item.price, item.category_id, item.is_available ?? true]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('update-item', async (_event, item) => {
        try {
            await query('UPDATE items SET name=?, price=?, category_id=?, is_available=? WHERE id=?', [item.name, item.price, item.category_id, item.is_available, item.id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('delete-item', async (_event, id) => {
        try {
            await query('DELETE FROM items WHERE id=?', [id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // ==================== RIDERS ====================
    ipcMain.handle('get-riders', async () => {
        try {
            const riders = await query('SELECT * FROM riders');
            return { success: true, data: riders };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('get-available-riders', async () => {
        try {
            const riders = await query("SELECT * FROM riders WHERE status = 'Available'");
            return { success: true, data: riders };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('add-rider', async (_event, rider) => {
        try {
            await query('INSERT INTO riders (name, phone, status) VALUES (?, ?, ?)', [rider.name, rider.phone, 'Available']);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('update-rider', async (_event, rider) => {
        try {
            await query('UPDATE riders SET name=?, phone=?, status=? WHERE id=?', [rider.name, rider.phone, rider.status, rider.id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('delete-rider', async (_event, id) => {
        try {
            await query('DELETE FROM riders WHERE id=?', [id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // ==================== EXPENSE CATEGORIES ====================
    ipcMain.handle('get-expense-categories', async () => {
        try {
            const categories = await query('SELECT * FROM expense_categories ORDER BY name ASC');
            return { success: true, data: categories };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('add-expense-category', async (_event, category) => {
        try {
            await query('INSERT INTO expense_categories (name) VALUES (?)', [category.name]);
            return { success: true };
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { success: false, error: 'Category name already exists' };
            }
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-expense-category', async (_event, category) => {
        try {
            await query('UPDATE expense_categories SET name = ? WHERE id = ?', [category.name, category.id]);
            return { success: true };
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { success: false, error: 'Category name already exists' };
            }
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('delete-expense-category', async (_event, id) => {
        try {
            // Check if category is being used
            const expenses: any = await query('SELECT COUNT(*) as count FROM expenses WHERE category = (SELECT name FROM expense_categories WHERE id = ?)', [id]) as any[];
            if (expenses && expenses.length > 0 && expenses[0].count > 0) {
                return { success: false, error: 'Cannot delete category. It is being used by expenses.' };
            }
            await query('DELETE FROM expense_categories WHERE id = ?', [id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // Helper function to recalculate closing cash after expense for a registry
    const recalculateRegistryClosingCash = async (registryId: number) => {
        try {
            // Get registry details
            const registries: any = await query('SELECT * FROM registries WHERE id = ?', [registryId]) as any[];
            if (!registries || registries.length === 0) return;

            const registry = registries[0];

            // Only recalculate if registry is closed
            if (registry.status !== 'Closed') return;

            // Calculate total expenses for this registry
            const expenses: any = await query(
                'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE registry_id = ?',
                [registryId]
            ) as any[];
            const totalExpenses = expenses && expenses.length > 0 ? (expenses[0]?.total || 0) : 0;

            // Recalculate closing_cash_after_expense
            const closingCashAfterExpense = (registry.closing_cash || 0) - totalExpenses;

            // Update the registry
            await query(
                'UPDATE registries SET closing_cash_after_expense = ? WHERE id = ?',
                [closingCashAfterExpense, registryId]
            );
        } catch (error: any) {
            console.error('Error recalculating registry closing cash:', error);
        }
    };

    // ==================== EXPENSES ====================
    ipcMain.handle('get-expenses', async (_event, filters?: { registryId?: number | null }) => {
        try {
            const registryId = filters?.registryId;
            if (registryId === null) {
                return { success: true, data: [] };
            }
            if (registryId != null) {
                const expenses = await query('SELECT * FROM expenses WHERE registry_id = ? ORDER BY created_at DESC', [registryId]);
                return { success: true, data: expenses };
            }
            const expenses = await query('SELECT * FROM expenses ORDER BY created_at DESC');
            return { success: true, data: expenses };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('add-expense', async (_event, expense) => {
        try {
            // Get current open registry — block expense if none open
            const registries: any = await query('SELECT id FROM registries WHERE status = "Open" ORDER BY start_time DESC LIMIT 1') as any[];
            const registryId = registries && registries.length > 0 ? registries[0].id : null;
            if (!registryId) {
                return { success: false, error: 'No registry is open. Start a registry to add expenses.' };
            }

            await query('INSERT INTO expenses (description, amount, category, registry_id) VALUES (?, ?, ?, ?)',
                [expense.description, expense.amount, expense.category, registryId]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('update-expense', async (_event, expense) => {
        try {
            // Get the expense's registry_id before updating
            const expenses: any = await query('SELECT registry_id FROM expenses WHERE id = ?', [expense.id]) as any[];
            const registryId = expenses && expenses.length > 0 ? expenses[0].registry_id : null;

            await query('UPDATE expenses SET description = ?, amount = ?, category = ? WHERE id = ?',
                [expense.description, expense.amount, expense.category, expense.id]);

            // Recalculate closing_cash_after_expense for the registry if it exists and is closed
            if (registryId) {
                await recalculateRegistryClosingCash(registryId);
            }

            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('delete-expense', async (_event, id) => {
        try {
            // Get the expense's registry_id before deleting
            const expenses: any = await query('SELECT registry_id FROM expenses WHERE id = ?', [id]) as any[];
            const registryId = expenses && expenses.length > 0 ? expenses[0].registry_id : null;

            await query('DELETE FROM expenses WHERE id = ?', [id]);

            // Recalculate closing_cash_after_expense for the registry if it exists and is closed
            if (registryId) {
                await recalculateRegistryClosingCash(registryId);
            }

            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // ==================== REFUNDS ====================
    ipcMain.handle('get-refunds', async () => {
        try {
            const refunds = await query('SELECT r.*, o.customer_name FROM refunds r LEFT JOIN orders o ON r.order_id = o.id ORDER BY r.created_at DESC');
            return { success: true, data: refunds };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('add-refund', async (_event, refund) => {
        try {
            await query('INSERT INTO refunds (order_id, amount, reason) VALUES (?, ?, ?)', [refund.order_id, refund.amount, refund.reason]);
            // Update order status to 'Refunded'
            await query('UPDATE orders SET status = ? WHERE id = ?', ['Refunded', refund.order_id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // ==================== SETTINGS ====================
    ipcMain.handle('get-setting', async (_event, key) => {
        try {
            const [row]: any = await query('SELECT value FROM settings WHERE key_name = ?', [key]) as any[];
            return { success: true, value: row ? row.value : null };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('save-setting', async (_event, { key, value }) => {
        try {
            console.log('IPC save-setting called:', key, value);

            // Double check table exists
            const checkTable = `
                CREATE TABLE IF NOT EXISTS settings(
                        key_name VARCHAR(255) PRIMARY KEY,
                        value TEXT
                    );
            `;
            await query(checkTable);

            await query('INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', [key, value, value]);
            console.log('IPC save-setting success');
            return { success: true };
        } catch (error: any) {
            console.error('IPC save-setting error:', error);
            return { success: false, error: error.message };
        }
    });

    // ==================== LICENSE ====================
    ipcMain.handle('check-license', async () => {
        try {
            const valid = isLicenseValid();
            const license = getLicenseData();
            return { success: true, valid, license };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-license-request', async () => {
        try {
            const systemInfo = getSystemInfo();
            const result = await sendLicenseRequest(systemInfo);
            return result;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('check-license-reply', async () => {
        try {
            const result = await checkLicenseReply();
            if (result.success && result.days) {
                const saved = saveLicenseData(result.days);
                if (saved) {
                    return { success: true, days: result.days };
                } else {
                    return { success: false, error: 'Failed to save license' };
                }
            }
            return result;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // ==================== PAYMENT METHODS ====================
    ipcMain.handle('get-payment-methods', async () => {
        try {
            const methods = await query(`
                SELECT pm.*,
                COUNT(pa.id) as account_count
                FROM payment_methods pm
                LEFT JOIN payment_accounts pa ON pm.id = pa.payment_method_id AND pa.is_active = TRUE
                GROUP BY pm.id
                ORDER BY pm.name
                `);
            return { success: true, data: methods };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('get-payment-summary', async (_event, filters) => {
        try {
            let sql = `
                SELECT 
                    pm.name as payment_method_name,
                    COUNT(o.id) as order_count,
                    SUM(o.total) as total_amount
                FROM payment_methods pm
                LEFT JOIN orders o ON o.payment_method = pm.name
            `;
            const params: any[] = [];

            if (filters?.startDate && filters?.endDate) {
                sql += ' WHERE DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?';
                params.push(filters.startDate, filters.endDate);
            }

            sql += ' GROUP BY pm.id ORDER BY total_amount DESC';

            const results = await query(sql, params);
            return { success: true, data: results };
        } catch (error: any) {
            console.error('Error fetching payment summary:', error);
            return { success: false, error: 'Failed to fetch payment summary' };
        }
    });

    ipcMain.handle('add-payment-method', async (_event, method) => {
        try {
            await query('INSERT INTO payment_methods (name) VALUES (?)', [method.name]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('update-payment-method', async (_event, method) => {
        try {
            await query('UPDATE payment_methods SET name=? WHERE id=?', [method.name, method.id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('delete-payment-method', async (_event, id) => {
        try {
            // Check if payment method has accounts
            const accounts: any = await query('SELECT COUNT(*) as count FROM payment_accounts WHERE payment_method_id = ?', [id]);
            if (accounts && accounts[0] && accounts[0].count > 0) {
                return { success: false, error: 'Cannot delete payment method with existing accounts' };
            }
            await query('DELETE FROM payment_methods WHERE id=?', [id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // ==================== PAYMENT ACCOUNTS ====================
    ipcMain.handle('get-payment-accounts', async (_event, paymentMethodId) => {
        try {
            const accounts = await query(`
                SELECT pa.*, pm.name as payment_method_name
                FROM payment_accounts pa
                LEFT JOIN payment_methods pm ON pa.payment_method_id = pm.id
                WHERE pa.payment_method_id = ?
                ORDER BY pa.created_at DESC
                    `, [paymentMethodId]);
            return { success: true, data: accounts };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('get-all-payment-accounts', async () => {
        try {
            const accounts = await query(`
                SELECT pa.*, pm.name as payment_method_name
                FROM payment_accounts pa
                LEFT JOIN payment_methods pm ON pa.payment_method_id = pm.id
                WHERE pa.is_active = TRUE
                ORDER BY pm.name, pa.account_number
                `);
            return { success: true, data: accounts };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('add-payment-account', async (_event, account) => {
        try {
            await query('INSERT INTO payment_accounts (payment_method_id, account_number, account_label, is_active) VALUES (?, ?, ?, ?)',
                [account.payment_method_id, account.account_number, account.account_label || null, account.is_active ?? true]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('update-payment-account', async (_event, account) => {
        try {
            await query('UPDATE payment_accounts SET account_number=?, account_label=?, is_active=? WHERE id=?',
                [account.account_number, account.account_label || null, account.is_active !== undefined ? account.is_active : true, account.id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('delete-payment-account', async (_event, id) => {
        try {
            await query('DELETE FROM payment_accounts WHERE id=?', [id]);
            return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    // ==================== REGISTRIES ====================
    ipcMain.handle('get-current-registry', async () => {
        try {
            const registries: any = await query('SELECT * FROM registries WHERE status = "Open" ORDER BY start_time DESC LIMIT 1') as any[];
            if (registries && registries.length > 0) {
                return { success: true, data: registries[0] };
            }
            return { success: true, data: null };
        } catch (error: any) {
            console.error('Error fetching current registry:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-registries', async (_event, filters: any) => {
        try {
            let sql = 'SELECT * FROM registries';
            const params: any[] = [];

            if (filters?.startDate && filters?.endDate) {
                sql += ' WHERE DATE(start_time) >= ? AND DATE(start_time) <= ?';
                params.push(filters.startDate, filters.endDate);
            }

            sql += ' ORDER BY start_time DESC';

            const results = await query(sql, params);
            return { success: true, data: results };
        } catch (error: any) {
            console.error('Error fetching registries:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-registry', async (_event, { opening_cash }) => {
        try {
            // Check if there's an open registry
            const registries: any = await query('SELECT * FROM registries WHERE status = "Open" ORDER BY start_time DESC LIMIT 1') as any[];
            if (registries && registries.length > 0) {
                return { success: false, error: 'A registry is already open. Please close it before starting a new one.' };
            }

            const result: any = await query(
                'INSERT INTO registries (start_time, opening_cash, status) VALUES (NOW(), ?, "Open")',
                [opening_cash || 0]
            );
            return { success: true, registryId: result.insertId };
        } catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('close-registry', async (_event, _data) => {
        try {
            // Get the current open registry
            const registries: any = await query('SELECT * FROM registries WHERE status = "Open" ORDER BY start_time DESC LIMIT 1') as any[];
            if (!registries || registries.length === 0) {
                return { success: false, error: 'No open registry found.' };
            }

            const registry = registries[0];
            const registryId = registry.id;
            const openingCash = Number(registry.opening_cash || 0);

            // Get orders for this registry
            const orders: any[] = await query('SELECT * FROM orders WHERE registry_id = ?', [registryId]) as any[];
            const expensesResult: any = await query(
                'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE registry_id = ?',
                [registryId]
            ) as any[];
            const totalExpenses = expensesResult && expensesResult.length > 0 ? Number(expensesResult[0]?.total || 0) : 0;
            const refunds: any[] = await query(
                `SELECT r.* FROM refunds r INNER JOIN orders o ON r.order_id = o.id WHERE o.registry_id = ? `,
                [registryId]
            ) as any[];
            const totalRefunds = refunds.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

            // Gross sale (no expense): totalSales - discount + serviceCharges + gst - refunds
            let totalSales = 0, totalDiscount = 0, totalServiceCharges = 0, totalGST = 0;
            for (const order of orders) {
                if (order.status === 'Cancelled') continue;
                totalSales += Number(order.total || 0);
                totalDiscount += Number(order.discount || 0);
                totalServiceCharges += Number(order.service_charges || 0);
                totalGST += Number(order.gst || 0);
            }
            const grossSale = totalSales - totalDiscount + totalServiceCharges + totalGST - totalRefunds;

            // Closing balance = opening + gross sale - expenses (expenses only deducted from cash, not from gross)
            const closingCash = openingCash + grossSale - totalExpenses;
            const closingCashAfterExpense = closingCash;

            await query(
                'UPDATE registries SET end_time = NOW(), closing_cash = ?, closing_cash_after_expense = ?, status = "Closed" WHERE id = ?',
                [closingCash, closingCashAfterExpense, registryId]
            );

            return { success: true };
        } catch (error: any) {
            console.error('Error closing registry:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-registry-summary', async (_event, registryId) => {
        try {
            const registries: any = await query('SELECT * FROM registries WHERE id = ?', [registryId]) as any[];
            if (!registries || registries.length === 0) {
                return { success: false, error: 'Registry not found' };
            }

            const reg = registries[0];

            // Get orders for this registry
            const orders: any = await query(
                'SELECT * FROM orders WHERE registry_id = ?',
                [registryId]
            );

            // Fetch order items and payments for these orders
            if (orders && orders.length > 0) {
                const orderIds = orders.map((o: any) => o.id);
                // Due to MySQL query library limitations with IN (?), we construct the placeholders
                const placeholders = orderIds.map(() => '?').join(',');

                const items: any = await query(`SELECT * FROM order_items WHERE order_id IN(${placeholders})`, orderIds);
                const payments: any = await query(`SELECT * FROM order_payments WHERE order_id IN(${placeholders})`, orderIds);

                const itemsMap: any = {};
                if (items && Array.isArray(items)) {
                    items.forEach((item: any) => {
                        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
                        itemsMap[item.order_id].push(item);
                    });
                }

                const paymentsMap: any = {};
                if (payments && Array.isArray(payments)) {
                    payments.forEach((payment: any) => {
                        if (!paymentsMap[payment.order_id]) paymentsMap[payment.order_id] = [];
                        paymentsMap[payment.order_id].push(payment);
                    });
                }

                orders.forEach((order: any) => {
                    order.items = itemsMap[order.id] || [];
                    order.payments = paymentsMap[order.id] || [];
                });
            }

            // Get expenses for this registry
            const expenses: any = await query(
                'SELECT * FROM expenses WHERE registry_id = ?',
                [registryId]
            );

            // Get refunds for orders in this registry
            const refunds: any = await query(
                `SELECT r.* FROM refunds r 
                 INNER JOIN orders o ON r.order_id = o.id 
                 WHERE o.registry_id = ? `,
                [registryId]
            );

            return {
                success: true,
                data: {
                    registry: reg,
                    orders: orders || [],
                    expenses: expenses || [],
                    refunds: refunds || []
                }
            };
        } catch (error: any) { return { success: false, error: error.message }; }
    });
}
