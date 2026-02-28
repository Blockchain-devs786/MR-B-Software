import { useEffect, useState } from 'react';
import { Receipt, Plus, Edit, Trash2, Tag } from 'lucide-react';
import AlertDialog from '../components/AlertDialog';

const Expenses = () => {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [currentRegistry, setCurrentRegistry] = useState<{ id: number } | null>(null);
    const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);
    const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
    const [categoryFormData, setCategoryFormData] = useState({ name: '' });
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: '' });

    const fetchExpenses = () => {
        if (!window.api) return;
        window.api.getCurrentRegistry().then(regRes => {
            const registry = regRes?.success && regRes?.data ? regRes.data : null;
            setCurrentRegistry(registry ? { id: registry.id } : null);
            window.api!.getExpenses(registry ? { registryId: registry.id } : { registryId: null }).then(res => {
                if (res.success) setExpenses(res.data ?? []);
            });
        });
    };

    const fetchExpenseCategories = () => {
        if (window.api) {
            window.api.getExpenseCategories().then(res => {
                if (res.success) {
                    setExpenseCategories(res.data);
                    // Set default category if none selected and categories exist
                    if (!newExpense.category && res.data.length > 0) {
                        setNewExpense(prev => ({ ...prev, category: res.data[0].name }));
                    }
                }
            });
        }
    };

    useEffect(() => {
        fetchExpenses();
        fetchExpenseCategories();
    }, []);

    useEffect(() => {
        const interval = setInterval(fetchExpenses, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (window.api) {
            if (editingExpense) {
                const res = await window.api.updateExpense({ ...newExpense, id: editingExpense.id });
                if (!res.success) {
                    alert(res.error || 'Failed to update expense');
                    return;
                }
            } else {
                const res = await window.api.addExpense(newExpense);
                if (!res.success) {
                    alert(res.error || 'Failed to add expense');
                    return;
                }
            }
            setShowModal(false);
            setEditingExpense(null);
            setNewExpense({ description: '', amount: '', category: expenseCategories.length > 0 ? expenseCategories[0].name : '' });
            fetchExpenses();
        }
    };

    const handleEditExpense = (expense: any) => {
        setEditingExpense(expense);
        setNewExpense({
            description: expense.description || '',
            amount: String(expense.amount || ''),
            category: expense.category || (expenseCategories.length > 0 ? expenseCategories[0].name : '')
        });
        setShowModal(true);
    };

    const handleDeleteExpense = (id: number) => {
        setExpenseToDelete(id);
        setShowDeleteExpenseConfirm(true);
    };

    const confirmDeleteExpense = async () => {
        if (expenseToDelete !== null && window.api) {
            const res = await window.api.deleteExpense(expenseToDelete);
            if (res.success) {
                fetchExpenses();
                setExpenseToDelete(null);
            } else {
                alert(res.error || 'Failed to delete expense');
            }
        }
    };

    const handleAddCategory = () => {
        setEditingCategory(null);
        setCategoryFormData({ name: '' });
        setShowCategoryModal(true);
    };

    const handleEditCategory = (category: any) => {
        setEditingCategory(category);
        setCategoryFormData({ name: category.name });
        setShowCategoryModal(true);
    };

    const handleDeleteCategory = (id: number) => {
        setCategoryToDelete(id);
        setShowDeleteCategoryConfirm(true);
    };

    const confirmDeleteCategory = async () => {
        if (categoryToDelete !== null && window.api) {
            const res = await window.api.deleteExpenseCategory(categoryToDelete);
            if (res.success) {
                fetchExpenseCategories();
                setCategoryToDelete(null);
            } else {
                alert(res.error || 'Failed to delete category');
            }
        }
    };

    const handleSubmitCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (window.api) {
            if (editingCategory) {
                const res = await window.api.updateExpenseCategory({ ...categoryFormData, id: editingCategory.id });
                if (!res.success) {
                    alert(res.error || 'Failed to update category');
                    return;
                }
            } else {
                const res = await window.api.addExpenseCategory(categoryFormData);
                if (!res.success) {
                    alert(res.error || 'Failed to add category');
                    return;
                }
            }
            setShowCategoryModal(false);
            setEditingCategory(null);
            setCategoryFormData({ name: '' });
            fetchExpenseCategories();
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Expenses</h2>
                    <p className="text-gray-500 mt-1">Track daily expenditures</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleAddCategory}
                        className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Tag size={20} /> Manage Categories
                    </button>
                    <button
                        onClick={() => {
                            if (!currentRegistry) {
                                alert('Start a registry to add expenses.');
                                return;
                            }
                            setShowModal(true);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${currentRegistry ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        title={currentRegistry ? undefined : 'Start a registry to add expenses'}
                    >
                        <Plus size={20} /> Add Expense
                    </button>
                </div>
            </div>

            {!currentRegistry && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 text-amber-800">
                    <p className="font-medium">Start a registry to add expenses. Expenses from closed registries are only visible in Reports.</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-medium text-gray-500 w-20">#</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Date</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Description</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Category</th>
                            <th className="px-6 py-4 font-medium text-gray-500 text-right">Amount</th>
                            <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map((expense, idx) => (
                            <tr key={expense.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                <td className="px-6 py-4 font-bold text-gray-700">{idx + 1}</td>
                                <td className="px-6 py-4 text-gray-500">{new Date(expense.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-lg">
                                        <Receipt size={20} className="text-red-500" />
                                    </div>
                                    {expense.description}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-bold text-gray-600">{expense.category}</span>
                                </td>
                                <td className="px-6 py-4 font-bold text-red-600 text-right">- Rs. {Number(expense.amount).toFixed(0)}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleEditExpense(expense)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="Edit Expense"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteExpense(expense.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Delete Expense"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {expenses.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-400">No expenses recorded.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    required
                                    value={newExpense.description}
                                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <input
                                    type="number"
                                    required
                                    value={newExpense.amount}
                                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={newExpense.category}
                                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {expenseCategories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingExpense(null);
                                        setNewExpense({ description: '', amount: '', category: expenseCategories.length > 0 ? expenseCategories[0].name : '' });
                                    }} 
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600">
                                    {editingExpense ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">
                            {editingCategory ? 'Edit Category' : 'Add New Category'}
                        </h3>
                        <form onSubmit={handleSubmitCategory} className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryFormData.name}
                                    onChange={e => setCategoryFormData({ name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                    placeholder="e.g., General, Inventory, Salaries"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCategoryModal(false);
                                        setEditingCategory(null);
                                        setCategoryFormData({ name: '' });
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600">
                                    Save
                                </button>
                            </div>
                        </form>

                        {expenseCategories.length > 0 && (
                            <div className="border-t border-gray-200 pt-4">
                                <h4 className="text-lg font-bold mb-4">Existing Categories</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {expenseCategories.map(category => (
                                        <div
                                            key={category.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                                        >
                                            <span className="font-medium text-gray-900">{category.name}</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditCategory(category)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(category.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Category Confirmation */}
            <AlertDialog
                isOpen={showDeleteCategoryConfirm}
                onClose={() => {
                    setShowDeleteCategoryConfirm(false);
                    setCategoryToDelete(null);
                }}
                onConfirm={confirmDeleteCategory}
                title="Delete Category"
                message="Are you sure you want to delete this category? This action cannot be undone if the category is not being used."
                type="confirm"
                confirmText="Delete"
                cancelText="Cancel"
            />

            {/* Delete Expense Confirmation */}
            <AlertDialog
                isOpen={showDeleteExpenseConfirm}
                onClose={() => {
                    setShowDeleteExpenseConfirm(false);
                    setExpenseToDelete(null);
                }}
                onConfirm={confirmDeleteExpense}
                title="Delete Expense"
                message="Are you sure you want to delete this expense? This action cannot be undone."
                type="confirm"
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default Expenses;
