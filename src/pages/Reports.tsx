import { useEffect, useState } from 'react';
import { BarChart3, Calendar, Printer } from 'lucide-react';
import RegistryManager from '../components/RegistryManager';
import RegistryPrintModal from '../components/RegistryPrintModal';
import { useToast } from '../components/Toast';

const Reports = () => {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState(firstOfMonth);
    const [toDate, setToDate] = useState(today);
    const [availableRegistries, setAvailableRegistries] = useState<any[]>([]);
    const [selectedRegistryId, setSelectedRegistryId] = useState<string>('all');
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchAvailableRegistries();
    }, [fromDate, toDate]);

    useEffect(() => {
        if (!loading) {
            let idsToAggregate: number[] = [];
            if (selectedRegistryId === 'all') {
                idsToAggregate = availableRegistries.map(r => r.id);
            } else {
                idsToAggregate = [Number(selectedRegistryId)];
            }
            aggregateRegistriesData(idsToAggregate);
        }
    }, [availableRegistries, selectedRegistryId, loading]);

    const aggregateRegistriesData = async (registryIds: number[]) => {
        if (registryIds.length === 0) {
            setReportData(null);
            return;
        }

        if (!window.api) {
            setReportData(null);
            return;
        }

        try {
            // Fetch data for all registries
            const registrySummaries = await Promise.all(
                registryIds.map(id => window.api.getRegistrySummary(id))
            );

            // Aggregate all orders, expenses, and refunds
            let allOrders: any[] = [];
            let allExpenses: any[] = [];
            let allRefunds: any[] = [];
            let registriesData: any[] = [];

            registrySummaries.forEach((res) => {
                if (res.success && res.data) {
                    allOrders = allOrders.concat(res.data.orders || []);
                    allExpenses = allExpenses.concat(res.data.expenses || []);
                    allRefunds = allRefunds.concat(res.data.refunds || []);
                    if (res.data.registry) {
                        registriesData.push(res.data.registry);
                    }
                }
            });

            if (registriesData.length === 0) {
                setReportData(null);
                return;
            }

            // Calculate aggregated registry info
            const totalOpeningCash = registriesData.reduce((sum, r) => sum + Number(r.opening_cash || 0), 0);
            const totalClosingCash = registriesData.reduce((sum, r) => sum + Number(r.closing_cash || 0), 0);
            const totalClosingCashAfterExpense = registriesData.reduce((sum, r) => sum + Number(r.closing_cash_after_expense || 0), 0);

            // Get earliest start_time and latest end_time
            const startTimes = registriesData.map(r => new Date(r.start_time).getTime()).filter(t => !isNaN(t));
            const endTimes = registriesData.map(r => r.end_time ? new Date(r.end_time).getTime() : null).filter(t => t !== null) as number[];

            const startTime = startTimes.length > 0 ? new Date(Math.min(...startTimes)).toISOString() : null;
            const endTime = endTimes.length > 0 ? new Date(Math.max(...endTimes)).toISOString() : null;

            // Fetch payment accounts
            const accountsRes = await window.api.getAllPaymentAccounts();
            const paymentAccounts = accountsRes.success ? (accountsRes.data || []) : [];

            // Process the aggregated data
            const reportData = processReportDataInternal(allOrders, allExpenses, allRefunds, paymentAccounts,
                startTime || new Date().toISOString(), endTime || new Date().toISOString());

            // Add aggregated registry data
            setReportData({
                ...reportData,
                registry: {
                    id: null,
                    start_time: startTime,
                    end_time: endTime,
                    opening_cash: totalOpeningCash,
                    closing_cash: totalClosingCash,
                    closing_cash_after_expense: totalClosingCashAfterExpense
                }
            });
        } catch (error) {
            console.error('Error aggregating registry data:', error);
            showToast('Failed to aggregate registry data');
            setReportData(null);
        }
    };

    const fetchAvailableRegistries = async () => {
        setLoading(true);
        try {
            if (!window.api) {
                setLoading(false);
                return;
            }
            const startDate = fromDate;
            const endDate = toDate;
            const res = await window.api.getRegistries({ startDate, endDate });
            if (res.success) {
                const regs = res.data || [];
                setAvailableRegistries(regs);

                if (selectedRegistryId !== 'all' && !regs.find((r: any) => r.id === Number(selectedRegistryId))) {
                    setSelectedRegistryId('all');
                }
            } else {
                showToast(res.error || 'Failed to load registries');
                setAvailableRegistries([]);
                setReportData(null);
            }
        } catch (error) {
            console.error('Error fetching registries:', error);
            showToast('Failed to load registries');
            setAvailableRegistries([]);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const processReportDataInternal = (orders: any[], expenses: any[], refunds: any[], _paymentAccounts: any[], startDate: string, endDate: string) => {
        // Sale Summary by Payment Type
        const saleSummary: Record<string, { count: number; amount: number }> = {
            'Cash': { count: 0, amount: 0 },
            'Credit Sale': { count: 0, amount: 0 },
            'Bank Transfer': { count: 0, amount: 0 },
            'Card': { count: 0, amount: 0 },
            'Other': { count: 0, amount: 0 }
        };

        // Order Type Summary
        const orderTypeSummary: Record<string, { count: number; amount: number; avgAmount: number }> = {
            'Dine-in': { count: 0, amount: 0, avgAmount: 0 },
            'Takeaway': { count: 0, amount: 0, avgAmount: 0 },
            'Delivery': { count: 0, amount: 0, avgAmount: 0 }
        };

        // Payment Mode Summary
        const paymentModeSummary: Record<string, { count: number; amount: number; _counted?: Set<number> }> = {};

        // Process orders
        let totalSales = 0;
        let totalDiscount = 0;
        let totalServiceCharges = 0;
        let totalGST = 0;
        let cancelledOrders = 0;
        let cancelledAmount = 0;
        let pendingOrders = 0;
        let pendingAmount = 0;

        orders.forEach((order: any) => {
            if (order.status === 'Cancelled') {
                cancelledOrders++;
                cancelledAmount += Number(order.total || 0);
                return;
            }

            // Pending orders: status is Pending OR status is Completed but payment is Pending
            if (order.status === 'Pending' || (order.status === 'Completed' && order.payment_status === 'Pending')) {
                pendingOrders++;
                pendingAmount += Number(order.total || 0);
            }

            // Include all non-Cancelled orders in sales (including Refunded – the sale happened, then we refunded)
            // So Sale shows full amount, Refund shows refund amount, Gross = Sale - Refund
            if (order.status !== 'Cancelled') {
                const amount = Number(order.total || 0);
                totalSales += amount;
                totalDiscount += Number(order.discount || 0);
                totalServiceCharges += Number(order.service_charges || 0);
                totalGST += Number(order.gst || 0);

                // Sale Summary by Payment Type
                if (order.payments && Array.isArray(order.payments) && order.payments.length > 0) {
                    order.payments.forEach((p: any) => {
                        const pt = p.payment_type || 'Cash';
                        const pKey = pt === 'Credit' ? 'Credit Sale' :
                            pt === 'Bank Transfer' ? 'Bank Transfer' :
                                pt === 'Card' ? 'Card' :
                                    pt === 'Cash' ? 'Cash' : 'Other';

                        if (saleSummary[pKey]) {
                            // Only count the order once per type (but could be multiple times if they do split payments of the exact same type, which is rare)
                            if (p.amount > 0) {
                                saleSummary[pKey].amount += Number(p.amount);
                                saleSummary[pKey].count++; // We'll count each payment entry as a "txn" for simplicity, or we could track unique order IDs.
                            }
                        }
                    });
                } else {
                    // Legacy fallback
                    const paymentType = order.payment_type || 'Cash';
                    const paymentTypeKey = paymentType === 'Credit' ? 'Credit Sale' :
                        paymentType === 'Bank Transfer' ? 'Bank Transfer' :
                            paymentType === 'Card' ? 'Card' :
                                paymentType === 'Cash' ? 'Cash' : 'Other';

                    if (saleSummary[paymentTypeKey]) {
                        saleSummary[paymentTypeKey].count++;
                        saleSummary[paymentTypeKey].amount += amount;
                    }
                }

                // Order Type Summary – only count non-Refunded so percentage = count/totalOrders ≤ 100%
                if (order.status !== 'Refunded' && orderTypeSummary[order.type]) {
                    orderTypeSummary[order.type].count++;
                    orderTypeSummary[order.type].amount += amount;
                }

                // Payment Mode Summary (by account) 
                if (order.payments && Array.isArray(order.payments) && order.payments.length > 0) {
                    order.payments.forEach((p: any) => {
                        let accountName = 'IN DRAW';
                        if (p.account_id) {
                            const acc = _paymentAccounts.find((a: any) => a.id === p.account_id);
                            if (acc) {
                                accountName = `${acc.payment_method_name} - ${acc.account_number} ${acc.account_label ? '(' + acc.account_label + ')' : ''}`.trim();
                            }
                        } else if (p.payment_type) {
                            accountName = p.payment_type === 'Cash' ? 'IN DRAW' : p.payment_type;
                        }

                        if (!paymentModeSummary[accountName]) {
                            paymentModeSummary[accountName] = { count: 0, amount: 0, _counted: new Set() };
                        } else if (!paymentModeSummary[accountName]._counted) {
                            paymentModeSummary[accountName]._counted = new Set();
                        }

                        if (p.amount > 0) {
                            paymentModeSummary[accountName].amount += Number(p.amount);
                            const countedSet = paymentModeSummary[accountName]._counted as Set<number>;
                            if (!countedSet.has(order.id)) {
                                paymentModeSummary[accountName].count++;
                                countedSet.add(order.id);
                            }
                        }
                    });
                } else {
                    // Legacy fallback
                    const paymentMethod = order.payment_method || 'IN DRAW';
                    const displayMethod = paymentMethod === 'Cash' ? 'IN DRAW' : paymentMethod;
                    if (!paymentModeSummary[displayMethod]) {
                        paymentModeSummary[displayMethod] = { count: 0, amount: 0 };
                    }
                    paymentModeSummary[displayMethod].count++;
                    paymentModeSummary[displayMethod].amount += amount;
                }
            }
        });

        // Calculate averages
        Object.keys(orderTypeSummary).forEach(type => {
            if (orderTypeSummary[type].count > 0) {
                orderTypeSummary[type].avgAmount = orderTypeSummary[type].amount / orderTypeSummary[type].count;
            }
        });

        // Clean up temporary mapping Sets
        Object.values(paymentModeSummary).forEach((data: any) => {
            delete data._counted;
        });

        // Calculate totals
        const totalRefunds = refunds.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
        const refundCount = refunds.length;
        const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
        const totalOrders = orders.filter((o: any) => o.status !== 'Cancelled' && o.status !== 'Refunded').length;
        // totalSales is already sum of order.total (each order.total is final amount after discount), so do NOT subtract totalDiscount again
        const saleAfterDiscount = totalSales;
        const netAmount = totalSales + totalServiceCharges;

        // Gross Sale: Total Sales (already after discount) + Service Charges + GST - Refunds
        const grossSale = totalSales + totalServiceCharges + totalGST - totalRefunds;

        // Calculate payment type totals
        const cashSale = saleSummary['Cash'].amount;
        const creditSale = saleSummary['Credit Sale'].amount;
        const cardSale = saleSummary['Card'].amount;
        const bankTransferSale = saleSummary['Bank Transfer'].amount;

        return {
            period: { startDate, endDate },
            saleSummary,
            orderTypeSummary,
            paymentModeSummary,
            totalSales,
            totalDiscount,
            totalServiceCharges,
            totalGST,
            totalRefunds,
            refundCount,
            totalExpenses,
            totalOrders,
            saleAfterDiscount,
            netAmount,
            grossSale,
            cancelledOrders,
            cancelledAmount,
            pendingOrders,
            pendingAmount,
            cashSale,
            creditSale,
            cardSale,
            bankTransferSale
        };
    };

    // Removed unused function - processReportData is not used anymore

    const handlePrint = () => {
        if (!reportData) {
            showToast('No report data to print');
            return;
        }
        setShowPrintModal(true);
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading report data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Reports</h2>
                <p className="text-gray-500 mt-1">Comprehensive sales and financial reports</p>
            </div>

            {/* Registry Manager */}
            <div className="mb-6">
                <RegistryManager />
            </div>

            {/* From–To Date Filter: one report for all registries in range */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-gray-400" />
                        <span className="font-medium text-gray-700">From</span>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                        />
                        <span className="font-medium text-gray-700">To</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                        />
                    </div>
                    {selectedRegistryId === 'all' && <span className="text-sm text-gray-500">All registries in this date range are combined into one report.</span>}

                    <div className="flex items-center gap-2 ml-4">
                        <span className="font-medium text-gray-700">Registry:</span>
                        <select
                            value={selectedRegistryId}
                            onChange={(e) => setSelectedRegistryId(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500 min-w-[200px]"
                        >
                            <option value="all">All ({availableRegistries.length})</option>
                            {availableRegistries.map(reg => (
                                <option key={reg.id} value={reg.id}>
                                    #{reg.id} - {new Date(reg.start_time).toLocaleString()}
                                </option>
                            ))}
                        </select>
                    </div>
                    {reportData && (
                        <button
                            onClick={handlePrint}
                            className="ml-auto flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium"
                        >
                            <Printer size={18} /> Print Report
                        </button>
                    )}
                </div>
            </div>

            {reportData ? (
                <div className="space-y-6">
                    {/* Registry Time */}
                    {reportData.registry && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-xl font-bold mb-4">Registry Time</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Start Time</div>
                                    <div className="font-bold text-gray-900">
                                        {new Date(reportData.registry.start_time).toLocaleString('en-PK')}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">End Time</div>
                                    <div className="font-bold text-gray-900">
                                        {reportData.registry.end_time
                                            ? new Date(reportData.registry.end_time).toLocaleString('en-PK')
                                            : 'Still Open'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sale Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xl font-bold mb-4">Sale Summary</h3>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">Type</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Count</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(reportData.saleSummary).map(([type, data]: [string, any]) => (
                                    <tr key={type} className="border-b border-gray-100 last:border-0">
                                        <td className="px-4 py-3 font-medium text-gray-900">{type}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">{data.count}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {data.amount.toFixed(0)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-gray-200 font-bold">
                                    <td className="px-4 py-3 text-gray-900">Total Sale</td>
                                    <td className="px-4 py-3 text-right text-gray-900">{reportData.totalOrders}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">Rs. {reportData.totalSales.toFixed(0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Cash in Hand */}
                    {reportData.registry && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-xl font-bold mb-4">Cash in Hand</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Opening Cash in Hand</span>
                                    <span className="font-bold">Rs. {Number(reportData.registry.opening_cash).toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Closing Cash</span>
                                    <span className="font-bold">Rs. {Number(reportData.registry.closing_cash).toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Expenses</span>
                                    <span className="font-bold text-red-600">- Rs. {reportData.totalExpenses.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between border-t-2 border-gray-200 pt-3">
                                    <span className="font-bold text-gray-900">Closing Cash After Expense</span>
                                    <span className="font-bold text-gray-900">Rs. {Number(reportData.registry.closing_cash_after_expense).toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order Type Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xl font-bold mb-4">Order Type</h3>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">Order Type</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Count</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Avg Amount</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(reportData.orderTypeSummary).map(([type, data]: [string, any]) => {
                                    const totalOrders = reportData.totalOrders;
                                    const percentage = totalOrders > 0 ? ((data.count / totalOrders) * 100).toFixed(1) : '0.0';
                                    return (
                                        <tr key={type} className="border-b border-gray-100 last:border-0">
                                            <td className="px-4 py-3 font-medium text-gray-900">{type}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">{data.count}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">Rs. {data.avgAmount.toFixed(0)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                Rs. {data.amount.toFixed(0)} ({percentage}%)
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Payment Mode Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xl font-bold mb-4">Payment Mode Summary</h3>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">Mode</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Count</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(reportData.paymentModeSummary).map(([mode, data]: [string, any]) => (
                                    <tr key={mode} className="border-b border-gray-100 last:border-0">
                                        <td className="px-4 py-3 font-medium text-gray-900">{mode}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">{data.count}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {data.amount.toFixed(0)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-gray-200 font-bold">
                                    <td className="px-4 py-3 text-gray-900">Total</td>
                                    <td className="px-4 py-3 text-right text-gray-900">{reportData.totalOrders}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">Rs. {reportData.totalSales.toFixed(0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Cancelled Orders - count and amount only, not deducted from gross */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xl font-bold mb-4">Cancelled</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">No. of orders</div>
                                <div className="text-2xl font-bold text-red-600">{reportData.cancelledOrders}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Amount</div>
                                <div className="text-2xl font-bold text-red-600">Rs. {reportData.cancelledAmount.toFixed(0)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Refunds - count and amount; amount is deducted from gross */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xl font-bold mb-4">Refunds</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">No. of refunds</div>
                                <div className="text-2xl font-bold text-purple-600">{reportData.refundCount ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Amount (deducted from gross)</div>
                                <div className="text-2xl font-bold text-purple-600">Rs. {(reportData.totalRefunds ?? 0).toFixed(0)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Gross Sale / MOP - Discount, GST, Net; Gross total only (no Card/Credit/Cash breakdown) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xl font-bold mb-4">Gross Sale / MOP</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Discount</span>
                                <span className="font-bold text-red-600">- Rs. {reportData.totalDiscount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Sale (After Discount)</span>
                                <span className="font-bold">Rs. {reportData.saleAfterDiscount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Cash GST</span>
                                <span className="font-bold">Rs. {reportData.totalGST.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Net Amount (Sale - Discount + Service Charges)</span>
                                <span className="font-bold">Rs. {reportData.netAmount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between border-t-4 border-orange-500 pt-4 mt-4">
                                <span className="text-2xl font-bold text-orange-600">GROSS SALE</span>
                                <span className="text-3xl font-bold text-orange-600">Rs. {reportData.grossSale.toFixed(0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pending Orders */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xl font-bold mb-4">Pending Orders</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">No of Orders</div>
                                <div className="text-2xl font-bold text-orange-600">{reportData.pendingOrders}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Amount</div>
                                <div className="text-2xl font-bold text-orange-600">Rs. {reportData.pendingAmount.toFixed(0)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <BarChart3 size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range (From – To) to view the combined report for all registries in that period.</p>
                </div>
            )}

            {/* Print Modal */}
            <RegistryPrintModal
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                reportData={reportData}
            />
        </div>
    );
};

export default Reports;
