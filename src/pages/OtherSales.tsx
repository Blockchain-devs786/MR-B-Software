import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, AlertCircle } from 'lucide-react';
import { useToast } from '../components/Toast';

const OtherSales = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'sales' | 'categories'>('sales');
    const [categories, setCategories] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [hasOpenRegistry, setHasOpenRegistry] = useState(false);
    const [loading, setLoading] = useState(true);

    // Category Modal
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [categoryName, setCategoryName] = useState('');

    // Sale Modal
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [saleAmount, setSaleAmount] = useState('');
    const [saleCategoryId, setSaleCategoryId] = useState<number | ''>('');
    const [saleNote, setSaleNote] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        if (window.api) {
            try {
                // Check open registry
                const registryRes = await window.api.getCurrentRegistry();
                setHasOpenRegistry(!!(registryRes.success && registryRes.data));

                // Load categories
                const catRes = await window.api.getOtherSaleCategories();
                if (catRes.success) setCategories(catRes.data || []);

                // Load sales (only if registry open, actually we fetch all current registry sales)
                const salesRes = await window.api.getOtherSales();
                if (salesRes.success) setSales(salesRes.data || []);
            } catch (error) {
                console.error('Error loading other sales data:', error);
            }
        }
        setLoading(false);
    };

    // --- Category Actions ---
    const handleSaveCategory = async () => {
        if (!categoryName.trim()) {
            showToast('Category name is required', 'error');
            return;
        }

        if (editingCategory) {
            const res = await window.api.updateOtherSaleCategory(editingCategory.id, categoryName);
            if (res.success) {
                showToast('Category updated');
                setShowCategoryModal(false);
                loadData();
            } else {
                showToast(res.error || 'Failed to update category', 'error');
            }
        } else {
            const res = await window.api.addOtherSaleCategory(categoryName);
            if (res.success) {
                showToast('Category created');
                setShowCategoryModal(false);
                loadData();
            } else {
                showToast(res.error || 'Failed to create category', 'error');
            }
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        const res = await window.api.deleteOtherSaleCategory(id);
        if (res.success) {
            showToast('Category deleted');
            loadData();
        } else {
            showToast(res.error || 'Failed to delete category (it may be in use)', 'error');
        }
    };

    // --- Record Sale Actions ---
    const handleRecordSale = async () => {
        if (!hasOpenRegistry) {
            showToast('Cannot record sale: No open registry', 'error');
            return;
        }
        if (!saleCategoryId) {
            showToast('Please select a category', 'error');
            return;
        }
        if (!saleAmount || isNaN(Number(saleAmount)) || Number(saleAmount) <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        const res = await window.api.addOtherSale({
            category_id: Number(saleCategoryId),
            amount: Number(saleAmount),
            note: saleNote
        });

        if (res.success) {
            showToast('Sale recorded successfully', 'success');
            setShowSaleModal(false);
            setSaleAmount('');
            setSaleNote('');
            setSaleCategoryId('');
            loadData();
        } else {
            showToast(res.error || 'Failed to record sale', 'error');
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Other Sales</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'sales' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Current Registry Sales
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'categories' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Manage Categories
                    </button>
                </div>
            </div>

            {!hasOpenRegistry && activeTab === 'sales' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-amber-800">
                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                    <div>
                        <h3 className="font-bold">No Open Registry</h3>
                        <p className="text-sm">You must have an open registry to record related other sales. Please return to the Orders page and open a registry.</p>
                    </div>
                </div>
            )}

            {activeTab === 'sales' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold">Sales (Current Registry)</h2>
                        <button
                            onClick={() => {
                                setSaleAmount('');
                                setSaleCategoryId('');
                                setSaleNote('');
                                setShowSaleModal(true);
                            }}
                            disabled={!hasOpenRegistry || categories.length === 0}
                            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={20} /> Record Sale
                        </button>
                    </div>

                    {categories.length === 0 && (
                        <p className="text-gray-500 text-sm mb-4">You need to create categories first before recording sales.</p>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="py-3 px-4 text-gray-500 font-medium">Date</th>
                                    <th className="py-3 px-4 text-gray-500 font-medium">Category</th>
                                    <th className="py-3 px-4 text-gray-500 font-medium">Amount</th>
                                    <th className="py-3 px-4 text-gray-500 font-medium">Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.length > 0 ? sales.map((sale: any) => (
                                    <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="py-3 px-4">{new Date(sale.created_at).toLocaleString()}</td>
                                        <td className="py-3 px-4 font-medium">{sale.category_name}</td>
                                        <td className="py-3 px-4 font-bold text-green-600">Rs. {sale.amount}</td>
                                        <td className="py-3 px-4 text-gray-600">{sale.note || '-'}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-gray-500">
                                            No sales recorded in the current registry.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold">Sales Categories</h2>
                        <button
                            onClick={() => {
                                setEditingCategory(null);
                                setCategoryName('');
                                setShowCategoryModal(true);
                            }}
                            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Category
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map((cat: any) => (
                            <div key={cat.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-orange-200 transition-colors">
                                <span className="font-bold text-gray-800">{cat.name}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingCategory(cat);
                                            setCategoryName(cat.name);
                                            setShowCategoryModal(true);
                                        }}
                                        className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <div className="col-span-full py-8 text-center text-gray-500 border-2 border-dashed border-gray-100 rounded-xl">
                                No categories added yet. Add categories to start recording other sales.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                            <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                                <input
                                    type="text"
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="e.g. Scraps, Leftovers..."
                                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                />
                            </div>
                            <button onClick={handleSaveCategory} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">
                                {editingCategory ? 'Save Changes' : 'Create Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSaleModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Record Sale</h2>
                            <button onClick={() => setShowSaleModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={saleCategoryId}
                                    onChange={(e) => setSaleCategoryId(Number(e.target.value))}
                                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
                                <input
                                    type="number"
                                    value={saleAmount}
                                    onChange={(e) => setSaleAmount(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                                <input
                                    type="text"
                                    value={saleNote}
                                    onChange={(e) => setSaleNote(e.target.value)}
                                    placeholder="Any additional details..."
                                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                />
                            </div>
                            <button onClick={handleRecordSale} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors">
                                Confirm Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OtherSales;
