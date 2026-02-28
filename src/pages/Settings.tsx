import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { Save, Upload } from 'lucide-react';

const Settings = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);

    // Form fields
    const [shopName, setShopName] = useState('');
    const [shopAddress, setShopAddress] = useState('');
    const [shopPhone, setShopPhone] = useState('');
    const [onlinePaymentId, setOnlinePaymentId] = useState('');
    const [receiptRemarks, setReceiptRemarks] = useState('');
    const [shopLogo, setShopLogo] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (!window.api) return;
        setLoading(true);
        try {
            // Load all relevant keys sequentially
            const keys = ['shop_name', 'shop_address', 'shop_phone', 'online_payment_id', 'receipt_remarks', 'shop_logo'];
            const results = await Promise.all(keys.map(key => window.api.getSetting(key)));

            setShopName(results[0]?.value || '');
            setShopAddress(results[1]?.value || '');
            setShopPhone(results[2]?.value || '');
            setOnlinePaymentId(results[3]?.value || '');
            setReceiptRemarks(results[4]?.value || '');
            setShopLogo(results[5]?.value || '');

            // Load payment accounts
            const accountResponse = await window.api.getAllPaymentAccounts();
            if (accountResponse.success) {
                setPaymentAccounts(accountResponse.data || []);
            }
        } catch (error) {
            console.error('Failed to load settings', error);
            showToast('Failed to load existing settings.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!window.api) return;

        setSaving(true);
        try {
            await window.api.saveSetting('shop_name', shopName);
            await window.api.saveSetting('shop_address', shopAddress);
            await window.api.saveSetting('shop_phone', shopPhone);
            await window.api.saveSetting('online_payment_id', onlinePaymentId);
            await window.api.saveSetting('receipt_remarks', receiptRemarks);
            await window.api.saveSetting('shop_logo', shopLogo);

            showToast('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save settings', error);
            showToast('Failed to save some settings.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setShopLogo(base64String);
        };
        reader.readAsDataURL(file);
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center">Loading settings...</div>;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
                    <p className="text-gray-500">Configure your store details and receipt customization.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">

                {/* Logo Upload Section */}
                <div className="pb-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold mb-4">Receipt Logo</h2>
                    <div className="flex items-start gap-6">
                        <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative">
                            {shopLogo ? (
                                <img src={shopLogo} alt="Shop Logo" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-gray-400 text-sm p-4 text-center">No Logo Uploaded</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="flex items-center justify-center gap-2 cursor-pointer bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium py-2 px-4 rounded-lg w-max transition-colors">
                                <Upload size={18} />
                                Upload new logo
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/jpg"
                                    onChange={handleLogoUpload}
                                />
                            </label>
                            <p className="text-sm text-gray-500 mt-2">Recommended: Square PNG or JPG. This logo will appear at the top of printed receipts.</p>

                            {shopLogo && (
                                <button type="button" onClick={() => setShopLogo('')} className="text-red-500 text-sm mt-3 hover:underline">
                                    Remove Logo
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* General Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                    <div className="md:col-span-2">
                        <h2 className="text-lg font-bold mb-1">Store Details</h2>
                        <p className="text-sm text-gray-500 mb-4">These details are shown on receipts and reports.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                        <input
                            type="text"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            placeholder="e.g. Mr B"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                            type="text"
                            value={shopPhone}
                            onChange={(e) => setShopPhone(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            placeholder="e.g. 03253211234"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shop Address</label>
                        <textarea
                            value={shopAddress}
                            onChange={(e) => setShopAddress(e.target.value)}
                            rows={2}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                            placeholder="e.g. Oppo. Kamalpur Interchange, Sargodha Road."
                        />
                    </div>
                </div>

                {/* Receipt Footers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                    <div className="md:col-span-2">
                        <h2 className="text-lg font-bold mb-1">Receipt Footer</h2>
                        <p className="text-sm text-gray-500 mb-4">Information shown at the bottom of the printed receipt.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Online Payment Account / Raast ID</label>
                        <select
                            value={onlinePaymentId}
                            onChange={(e) => setOnlinePaymentId(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        >
                            <option value="">-- None --</option>
                            {paymentAccounts.map((account) => (
                                <option key={account.id} value={account.account_number}>
                                    {account.account_number} {account.account_label ? `(${account.account_label})` : ''} - {account.method_name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Select an account to display its ID for online payments.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Remarks</label>
                        <input
                            type="text"
                            value={receiptRemarks}
                            onChange={(e) => setReceiptRemarks(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            placeholder="e.g. null"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
