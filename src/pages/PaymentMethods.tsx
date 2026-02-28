import { useEffect, useState } from 'react';
import { CreditCard, Plus, Edit, Trash2, ChevronDown, ChevronRight, Phone, Building2 } from 'lucide-react';
import AlertDialog from '../components/AlertDialog';

const PaymentMethods = () => {
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [expandedMethods, setExpandedMethods] = useState<Set<number>>(new Set());
    const [accounts, setAccounts] = useState<Record<number, any[]>>({});
    const [showMethodModal, setShowMethodModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [editingMethod, setEditingMethod] = useState<any>(null);
    const [editingAccount, setEditingAccount] = useState<any>(null);
    const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
    const [methodFormData, setMethodFormData] = useState({ name: '' });
    const [accountFormData, setAccountFormData] = useState({ account_number: '', account_label: '' });
    const [showDeleteMethodConfirm, setShowDeleteMethodConfirm] = useState(false);
    const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
    const [methodToDelete, setMethodToDelete] = useState<number | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<number | null>(null);

    const fetchPaymentMethods = () => {
        if (window.api) {
            window.api.getPaymentMethods().then(res => {
                if (res.success) setPaymentMethods(res.data);
            });
        }
    };

    const fetchAccounts = async (methodId: number) => {
        if (window.api) {
            const res = await window.api.getPaymentAccounts(methodId);
            if (res.success) {
                setAccounts(prev => ({ ...prev, [methodId]: res.data }));
            }
        }
    };

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const toggleMethod = (methodId: number) => {
        const newExpanded = new Set(expandedMethods);
        if (newExpanded.has(methodId)) {
            newExpanded.delete(methodId);
        } else {
            newExpanded.add(methodId);
            if (!accounts[methodId]) {
                fetchAccounts(methodId);
            }
        }
        setExpandedMethods(newExpanded);
    };

    const handleEditMethod = (method: any) => {
        setEditingMethod(method);
        setMethodFormData({ name: method.name });
        setShowMethodModal(true);
    };

    const handleDeleteMethod = (id: number) => {
        setMethodToDelete(id);
        setShowDeleteMethodConfirm(true);
    };

    const confirmDeleteMethod = async () => {
        if (methodToDelete !== null && window.api) {
            const res = await window.api.deletePaymentMethod(methodToDelete);
            if (res.success) {
                fetchPaymentMethods();
                setMethodToDelete(null);
            } else {
                alert(res.error || 'Failed to delete payment method');
            }
        }
    };

    const handleSubmitMethod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (window.api) {
            if (editingMethod) {
                const res = await window.api.updatePaymentMethod({ ...methodFormData, id: editingMethod.id });
                if (!res.success) {
                    alert(res.error || 'Failed to update payment method');
                    return;
                }
            } else {
                const res = await window.api.addPaymentMethod(methodFormData);
                if (!res.success) {
                    alert(res.error || 'Failed to add payment method');
                    return;
                }
            }
            setShowMethodModal(false);
            setEditingMethod(null);
            setMethodFormData({ name: '' });
            fetchPaymentMethods();
        }
    };

    const handleAddAccount = (methodId: number) => {
        setSelectedMethodId(methodId);
        setEditingAccount(null);
        setAccountFormData({ account_number: '', account_label: '' });
        setShowAccountModal(true);
    };

    const handleEditAccount = (account: any) => {
        setEditingAccount(account);
        setSelectedMethodId(account.payment_method_id);
        setAccountFormData({ 
            account_number: account.account_number, 
            account_label: account.account_label || '' 
        });
        setShowAccountModal(true);
    };

    const handleDeleteAccount = (id: number) => {
        setAccountToDelete(id);
        setShowDeleteAccountConfirm(true);
    };

    const confirmDeleteAccount = async () => {
        if (accountToDelete !== null && window.api) {
            const res = await window.api.deletePaymentAccount(accountToDelete);
            if (res.success) {
                // Refresh accounts for the method
                const account = Object.values(accounts).flat().find(a => a.id === accountToDelete);
                if (account) {
                    fetchAccounts(account.payment_method_id);
                    // Refresh payment methods to update account count
                    fetchPaymentMethods();
                }
                setAccountToDelete(null);
            } else {
                alert(res.error || 'Failed to delete account');
            }
        }
    };

    const handleSubmitAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMethodId) return;
        if (window.api) {
            const accountData = {
                payment_method_id: selectedMethodId,
                account_number: accountFormData.account_number,
                account_label: accountFormData.account_label || null,
                is_active: editingAccount ? (editingAccount.is_active !== undefined ? editingAccount.is_active : true) : true
            };
            if (editingAccount) {
                const res = await window.api.updatePaymentAccount({ ...accountData, id: editingAccount.id });
                if (!res.success) {
                    alert(res.error || 'Failed to update account');
                    return;
                }
            } else {
                const res = await window.api.addPaymentAccount(accountData);
                if (!res.success) {
                    alert(res.error || 'Failed to add account');
                    return;
                }
            }
            setShowAccountModal(false);
            setEditingAccount(null);
            setAccountFormData({ account_number: '', account_label: '' });
            const methodId = selectedMethodId;
            setSelectedMethodId(null);
            if (methodId) {
                fetchAccounts(methodId);
                // Refresh payment methods to update account count
                fetchPaymentMethods();
            }
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Payment Methods Management</h2>
                    <p className="text-gray-500 mt-1">Manage payment methods and their account numbers</p>
                </div>
                <button
                    onClick={() => { setEditingMethod(null); setMethodFormData({ name: '' }); setShowMethodModal(true); }}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={20} /> Add Payment Method
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {paymentMethods.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No payment methods found. Add one to get started.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {paymentMethods.map((method) => (
                            <div key={method.id} className="hover:bg-gray-50">
                                <div 
                                    className="flex items-center justify-between p-4 cursor-pointer"
                                    onClick={() => toggleMethod(method.id)}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        {expandedMethods.has(method.id) ? (
                                            <ChevronDown size={20} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={20} className="text-gray-400" />
                                        )}
                                        <div className="bg-orange-100 p-2 rounded-lg">
                                            <CreditCard size={20} className="text-orange-500" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{method.name}</div>
                                            <div className="text-sm text-gray-500">
                                                {method.account_count || 0} account{method.account_count !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleAddAccount(method.id)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                            title="Add Account"
                                        >
                                            <Plus size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleEditMethod(method)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMethod(method.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                
                                {expandedMethods.has(method.id) && (
                                    <div className="pl-16 pr-4 pb-4">
                                        {accounts[method.id] && accounts[method.id].length > 0 ? (
                                            <div className="space-y-2">
                                                {accounts[method.id].map((account) => (
                                                    <div
                                                        key={account.id}
                                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {account.payment_method_name?.toLowerCase().includes('bank') ? (
                                                                <Building2 size={18} className="text-gray-400" />
                                                            ) : (
                                                                <Phone size={18} className="text-gray-400" />
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-gray-900">{account.account_number}</div>
                                                                {account.account_label && (
                                                                    <div className="text-sm text-gray-500">{account.account_label}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleEditAccount(account)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAccount(account.id)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-gray-400 text-sm">
                                                No accounts added. Click the + button to add one.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Payment Method Modal */}
            {showMethodModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">{editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}</h3>
                        <form onSubmit={handleSubmitMethod} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={methodFormData.name}
                                    onChange={e => setMethodFormData({ ...methodFormData, name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                    placeholder="e.g., JazzCash, EasyPaisa, Allied Bank"
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowMethodModal(false);
                                        setEditingMethod(null);
                                        setMethodFormData({ name: '' });
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
                    </div>
                </div>
            )}

            {/* Payment Account Modal */}
            {showAccountModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">
                            {editingAccount ? 'Edit Account' : 'Add New Account'}
                        </h3>
                        <form onSubmit={handleSubmitAccount} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                <input
                                    type="text"
                                    required
                                    value={accountFormData.account_number}
                                    onChange={e => setAccountFormData({ ...accountFormData, account_number: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                    placeholder="e.g., 0301-XXXXXXX or Account No: 0123456789"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Label (Optional)</label>
                                <input
                                    type="text"
                                    value={accountFormData.account_label}
                                    onChange={e => setAccountFormData({ ...accountFormData, account_label: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                    placeholder="e.g., Main Account, Personal Account"
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAccountModal(false);
                                        setEditingAccount(null);
                                        setAccountFormData({ account_number: '', account_label: '' });
                                        setSelectedMethodId(null);
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
                    </div>
                </div>
            )}

            {/* Delete Method Confirmation */}
            <AlertDialog
                isOpen={showDeleteMethodConfirm}
                onClose={() => {
                    setShowDeleteMethodConfirm(false);
                    setMethodToDelete(null);
                }}
                onConfirm={confirmDeleteMethod}
                title="Delete Payment Method"
                message="Are you sure you want to delete this payment method? This will also delete all associated accounts. This action cannot be undone."
                type="confirm"
                confirmText="Delete"
                cancelText="Cancel"
            />

            {/* Delete Account Confirmation */}
            <AlertDialog
                isOpen={showDeleteAccountConfirm}
                onClose={() => {
                    setShowDeleteAccountConfirm(false);
                    setAccountToDelete(null);
                }}
                onConfirm={confirmDeleteAccount}
                title="Delete Account"
                message="Are you sure you want to delete this account? This action cannot be undone."
                type="confirm"
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default PaymentMethods;
