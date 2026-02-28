import { useEffect, useState } from 'react';
import { Bike, Phone, Plus, Edit, Trash2 } from 'lucide-react';
import AlertDialog from '../components/AlertDialog';

const Riders = () => {
    const [riders, setRiders] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingRider, setEditingRider] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', phone: '', status: 'Available' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [riderToDelete, setRiderToDelete] = useState<number | null>(null);

    const fetchRiders = () => {
        if (window.api) {
            window.api.getRiders().then(res => {
                if (res.success) setRiders(res.data);
            });
        }
    };

    useEffect(() => {
        fetchRiders();
    }, []);

    const handleEdit = (rider: any) => {
        setEditingRider(rider);
        setFormData({ name: rider.name, phone: rider.phone, status: rider.status });
        setShowModal(true);
    };

    const handleDelete = (id: number) => {
        setRiderToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (riderToDelete !== null && window.api) {
            await window.api.deleteRider(riderToDelete);
            fetchRiders();
            setRiderToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (window.api) {
            if (editingRider) {
                await window.api.updateRider({ ...formData, id: editingRider.id });
            } else {
                await window.api.addRider(formData);
            }
            setShowModal(false);
            setEditingRider(null);
            setFormData({ name: '', phone: '', status: 'Available' });
            fetchRiders();
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Riders</h2>
                    <p className="text-gray-500 mt-1">Monitor delivery riders</p>
                </div>
                <button
                    onClick={() => { setEditingRider(null); setFormData({ name: '', phone: '', status: 'Available' }); setShowModal(true); }}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={20} /> Add Rider
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {riders.map((rider) => (
                    <div key={rider.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-100 p-3 rounded-full">
                                    <Bike size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{rider.name}</h3>
                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                        <Phone size={14} /> {rider.phone || 'N/A'}
                                    </div>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${rider.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {rider.status}
                            </span>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-gray-50 pt-3">
                            <button onClick={() => handleEdit(rider)} className="text-gray-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1"><Edit size={16} /> Edit</button>
                            <button onClick={() => handleDelete(rider.id)} className="text-gray-500 hover:text-red-600 text-sm font-medium flex items-center gap-1"><Trash2 size={16} /> Delete</button>
                        </div>
                    </div>
                ))}
                {riders.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-400">
                        <p>No riders found.</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">{editingRider ? 'Edit Rider' : 'Add New Rider'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                                >
                                    <option>Available</option>
                                    <option>Busy</option>
                                    <option>Offline</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AlertDialog
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setRiderToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Rider"
                message="Are you sure you want to delete this rider? This action cannot be undone."
                type="confirm"
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default Riders;
