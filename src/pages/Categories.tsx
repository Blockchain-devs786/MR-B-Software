import { useEffect, useState } from 'react';
import { Folder, Plus, Edit, Trash2 } from 'lucide-react';
import AlertDialog from '../components/AlertDialog';

const Categories = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

    const fetchCategories = () => {
        if (window.api) {
            window.api.getCategories().then(res => {
                if (res.success) setCategories(res.data);
            });
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleEdit = (category: any) => {
        setEditingCategory(category);
        setFormData({ name: category.name });
        setShowModal(true);
    };

    const handleDelete = (id: number) => {
        setCategoryToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (categoryToDelete !== null && window.api) {
            const res = await window.api.deleteCategory(categoryToDelete);
            if (res.success) {
                fetchCategories();
                setCategoryToDelete(null);
            } else {
                alert(res.error || 'Failed to delete category');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (window.api) {
            if (editingCategory) {
                await window.api.updateCategory({ ...formData, id: editingCategory.id });
            } else {
                await window.api.addCategory(formData);
            }
            setShowModal(false);
            setEditingCategory(null);
            setFormData({ name: '' });
            fetchCategories();
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Categories Management</h2>
                    <p className="text-gray-500 mt-1">Manage item categories</p>
                </div>
                <button
                    onClick={() => { setEditingCategory(null); setFormData({ name: '' }); setShowModal(true); }}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={20} /> Add Category
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-medium text-gray-500">ID</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Name</th>
                            <th className="px-6 py-4 font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-500">#{category.id}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                    <div className="bg-orange-100 p-2 rounded-lg">
                                        <Folder size={20} className="text-orange-500" />
                                    </div>
                                    {category.name}
                                </td>
                                <td className="px-6 py-4 flex gap-2">
                                    <button onClick={() => handleEdit(category)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(category.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan={3} className="text-center py-10 text-gray-400">No categories found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                    placeholder="Enter category name"
                                />
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
                    setCategoryToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Category"
                message="Are you sure you want to delete this category? This action cannot be undone. Categories with items cannot be deleted."
                type="confirm"
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default Categories;
