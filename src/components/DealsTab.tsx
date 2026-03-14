import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import AlertDialog from './AlertDialog';
import { useToast } from '../components/Toast';

const DealsTab = ({ items }: { items: any[] }) => {
    const [deals, setDeals] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingDeal, setEditingDeal] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [dealToDelete, setDealToDelete] = useState<number | null>(null);
    const { showToast } = useToast();

    const [formData, setFormData] = useState<{
        name: string;
        discount: string;
        categories: { name: string; quantity: number; items: number[] }[];
    }>({
        name: '',
        discount: '',
        categories: []
    });

    const fetchDeals = () => {
        if (window.api && window.api.getDeals) {
            window.api.getDeals().then(res => {
                if (res.success) setDeals(res.data);
            });
        }
    };

    useEffect(() => {
        fetchDeals();
    }, []);

    const handleEdit = (deal: any) => {
        setEditingDeal(deal);
        setFormData({
            name: deal.name,
            discount: String(deal.discount || 0),
            categories: (deal.categories || []).map((c: any) => ({
                name: c.name,
                quantity: c.quantity,
                items: c.items.map((i: any) => Number(i.item_id))
            }))
        });
        setShowModal(true);
    };

    const handleDelete = (id: number) => {
        setDealToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (dealToDelete !== null && window.api) {
            await window.api.deleteDeal(dealToDelete);
            fetchDeals();
            setDealToDelete(null);
        }
    };

    const toggleStatus = async (deal: any) => {
        if (window.api) {
            await window.api.toggleDealStatus(deal.id, !deal.is_active);
            fetchDeals();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.discount) {
            showToast('Please provide a name and discount for the deal');
            return;
        }
        if (formData.categories.length === 0) {
            showToast('Please add at least one category to the deal');
            return;
        }

        // Validate categories
        for (const cat of formData.categories) {
            if (!cat.name.trim() || cat.quantity < 1 || cat.items.length === 0) {
                showToast('Each category must have a name, quantity > 0, and at least one item');
                return;
            }
        }

        const dealData = {
            name: formData.name,
            discount: Number(formData.discount),
            is_active: editingDeal ? editingDeal.is_active : true,
            categories: formData.categories
        };

        if (window.api) {
            if (editingDeal) {
                const res = await window.api.updateDeal(editingDeal.id, dealData);
                if (!res.success) showToast(res.error || 'Failed to update deal');
            } else {
                const res = await window.api.createDeal(dealData);
                if (!res.success) showToast(res.error || 'Failed to create deal');
            }
            setShowModal(false);
            setEditingDeal(null);
            fetchDeals();
        }
    };

    const addCategory = () => {
        setFormData(prev => ({
            ...prev,
            categories: [...prev.categories, { name: '', quantity: 1, items: [] }]
        }));
    };

    const removeCategory = (index: number) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.filter((_, i) => i !== index)
        }));
    };

    const updateCategory = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const newCats = [...prev.categories];
            newCats[index] = { ...newCats[index], [field]: value };
            return { ...prev, categories: newCats };
        });
    };

    const toggleItemSelection = (catIndex: number, itemId: number) => {
        setFormData(prev => {
            const newCats = [...prev.categories];
            const currentCat = { ...newCats[catIndex] };
            const hasItem = currentCat.items.includes(itemId);
            if (hasItem) {
                currentCat.items = currentCat.items.filter((id: number) => id !== itemId);
            } else {
                currentCat.items = [...currentCat.items, itemId];
            }
            newCats[catIndex] = currentCat;
            return { ...prev, categories: newCats };
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Combo Deals</h2>
                </div>
                <button
                    onClick={() => {
                        setEditingDeal(null);
                        setFormData({ name: '', discount: '', categories: [{ name: '', quantity: 1, items: [] }] });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={20} /> Create Deal
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-medium text-gray-500">Name</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Discount</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Includes</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deals.map(deal => (
                            <tr key={deal.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <span className="text-gray-400 text-xs font-bold mr-2">#{deal.id}</span>
                                    {deal.name}
                                </td>
                                <td className="px-6 py-4 font-medium text-orange-600">{Number(deal.discount || 0).toFixed(0)}%</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {(deal.categories || []).map((cat: any) => (
                                        <div key={cat.id}>
                                            <span className="font-semibold">{cat.quantity}x</span> {cat.name} ({cat.items.length} options)
                                        </div>
                                    ))}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => toggleStatus(deal)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${deal.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                    >
                                        {deal.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 flex gap-2">
                                    <button onClick={() => handleEdit(deal)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(deal.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                        {deals.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-400">No deals found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold">{editingDeal ? 'Edit Combo Deal' : 'Create New Deal'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="dealForm" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                            placeholder="e.g. Zinger Combo"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Deal Discount (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            required
                                            value={formData.discount}
                                            onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                            placeholder="e.g. 10"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold text-gray-900">Deal Categories</h4>
                                        <button
                                            type="button"
                                            onClick={addCategory}
                                            className="text-orange-500 text-sm font-medium hover:text-orange-600 flex items-center gap-1"
                                        >
                                            <Plus size={16} /> Add Category Slot
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {formData.categories.map((cat, catIdx) => (
                                            <div key={catIdx} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                                                <div className="flex justify-between mb-3">
                                                    <div className="grid grid-cols-2 gap-4 flex-1 mr-4">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Slot Name (e.g. Burger)</label>
                                                            <input
                                                                type="text"
                                                                value={cat.name}
                                                                onChange={e => updateCategory(catIdx, 'name', e.target.value)}
                                                                className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:border-orange-500 bg-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Quantity to choose</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={cat.quantity}
                                                                onChange={e => updateCategory(catIdx, 'quantity', parseInt(e.target.value) || 1)}
                                                                className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:border-orange-500 bg-white"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => removeCategory(catIdx)} className="text-red-500 self-start p-1 mt-5">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-2">Allowed Options (Select multiple)</label>
                                                    <div className="max-h-40 overflow-y-auto border border-gray-200 bg-white rounded p-2 grid grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {items.map(item => {
                                                            const isSelected = cat.items.includes(item.id);
                                                            return (
                                                                <label key={item.id} className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-sm ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isSelected}
                                                                        onChange={() => toggleItemSelection(catIdx, item.id)}
                                                                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                                                    />
                                                                    <span className="flex-1 truncate">{item.name}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {formData.categories.length === 0 && (
                                            <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-500">
                                                No categories added. A deal needs options (e.g. 1 Pizza, 1 Drink).
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                            <button type="submit" form="dealForm" className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600">Save Deal</button>
                        </div>
                    </div>
                </div>
            )}

            <AlertDialog
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDealToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Combo Deal"
                message="Are you sure you want to delete this deal? This action cannot be undone."
                type="confirm"
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default DealsTab;
