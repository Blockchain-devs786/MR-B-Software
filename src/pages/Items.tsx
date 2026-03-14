import { useEffect, useState } from 'react';
import { Package, Plus, Edit, Trash2, Tag } from 'lucide-react';
import AlertDialog from '../components/AlertDialog';
import DealsTab from '../components/DealsTab';

type TabType = 'items' | 'deals';

const Items = () => {
    const [activeTab, setActiveTab] = useState<TabType>('items');
    const [items, setItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', price: '', category_id: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    const fetchItems = () => {
        if (window.api) {
            window.api.getItems().then(res => {
                if (res.success) setItems(res.data);
            });
        }
    };

    const fetchCategories = () => {
        if (window.api) {
            window.api.getCategories().then(res => {
                if (res.success) {
                    setCategories(res.data);
                    if (res.data.length > 0 && !formData.category_id) {
                        setFormData(prev => ({ ...prev, category_id: String(res.data[0].id) }));
                    }
                }
            });
        }
    };

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setFormData({ 
            name: item.name || '', 
            price: String(item.price || ''), 
            category_id: item.category_id ? String(item.category_id) : '' 
        });
        setShowModal(true);
    };

    const handleDelete = (id: number) => {
        setItemToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete !== null && window.api) {
            await window.api.deleteItem(itemToDelete);
            fetchItems();
            setItemToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category_id) {
            alert('Please select a category');
            return;
        }
        if (window.api) {
            const itemData = {
                name: formData.name,
                price: Number(formData.price),
                category_id: Number(formData.category_id),
                is_available: editingItem ? (editingItem.is_available !== undefined ? editingItem.is_available : true) : true
            };
            if (editingItem) {
                const res = await window.api.updateItem({ ...itemData, id: editingItem.id });
                if (!res.success) {
                    alert(res.error || 'Failed to update item');
                    return;
                }
            } else {
                const res = await window.api.addItem(itemData);
                if (!res.success) {
                    alert(res.error || 'Failed to add item');
                    return;
                }
            }
            setShowModal(false);
            setEditingItem(null);
            setFormData({ name: '', price: '', category_id: categories.length > 0 ? String(categories[0].id) : '' });
            fetchItems();
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Items & Deals</h2>
                    <p className="text-gray-500 mt-1">Manage food items, pricing, and combo deals</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-8 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('items')}
                    className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'items' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Package size={18} /> Items
                </button>
                <button
                    onClick={() => setActiveTab('deals')}
                    className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'deals' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Tag size={18} /> Deals
                </button>
            </div>

            {activeTab === 'items' && (
                <>
                    <div className="flex justify-end items-center mb-6">
                        <button
                            onClick={() => { setEditingItem(null); setFormData({ name: '', price: '', category_id: categories.length > 0 ? String(categories[0].id) : '' }); setShowModal(true); }}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Plus size={20} /> Add Item
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-medium text-gray-500">ID</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Name</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Category</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Price</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-500">#{item.id}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                    <div className="bg-orange-100 p-2 rounded-lg">
                                        <Package size={20} className="text-orange-500" />
                                    </div>
                                    {item.name}
                                </td>
                                <td className="px-6 py-4 text-gray-600">{item.category_name || 'Uncategorized'}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">Rs. {Number(item.price).toFixed(0)}</td>
                                <td className="px-6 py-4 flex gap-2">
                                    <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-400">No items found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={formData.category_id}
                                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                    required
                                >
                                    {categories.length === 0 ? (
                                        <option value="">No categories available</option>
                                    ) : (
                                        <>
                                            <option value="">Select Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                                            ))}
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AlertDialog
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setItemToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Item"
                message="Are you sure you want to delete this item? This action cannot be undone."
                type="confirm"
                confirmText="Delete"
                cancelText="Cancel"
            />
            </>
            )}

            {activeTab === 'deals' && (
                <DealsTab items={items} />
            )}
        </div>
    );
};

export default Items;
