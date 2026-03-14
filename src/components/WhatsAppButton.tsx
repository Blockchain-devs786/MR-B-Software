import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Settings } from 'lucide-react';
import { getWhatsAppMessage } from '../utils/whatsappTemplates';
import { useToast } from './Toast';

interface WhatsAppButtonProps {
    order: any;
}

const WhatsAppButton = ({ order }: WhatsAppButtonProps) => {
    const { showToast } = useToast();
    const [senderNumber, setSenderNumber] = useState<string | null>(null);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [inputNumber, setInputNumber] = useState('');
    const [isEditingNumber, setIsEditingNumber] = useState(false);

    // Fetch existing sender number on mount
    useEffect(() => {
        const fetchSetting = async () => {
            if (window.api) {
                const res = await window.api.getSetting('whatsapp_sender_number');
                if (res.success && res.value) {
                    setSenderNumber(res.value);
                }
            }
        };
        fetchSetting();
    }, []);

    const handleInitialClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!order.customer_phone) return;

        if (!senderNumber) {
            setShowSetupModal(true);
        } else {
            setShowConfirmModal(true);
        }
    };

    const validateNumber = (num: string) => {
        // Basic validation for +92 format or 03...
        // Auto-convert 03 to +923
        let cleanNum = num.replace(/\D/g, ''); // Remove non-digits

        if (cleanNum.startsWith('03')) {
            cleanNum = '92' + cleanNum.substring(1);
        }

        if (!cleanNum.startsWith('923') || cleanNum.length !== 12) {
            return null;
        }
        return '+' + cleanNum;
    };

    const saveAndSend = async () => {
        console.log('Attempting to save:', inputNumber);
        const validNum = validateNumber(inputNumber);
        console.log('Validated number:', validNum);

        if (!validNum) {
            showToast('Invalid number format. Use 0300... or +92300...', 'error');
            return;
        }

        if (window.api) {
            try {
                console.log('Calling api.saveSetting...');
                const res = await window.api.saveSetting('whatsapp_sender_number', validNum);
                console.log('Save result:', res);

                if (res.success) {
                    setSenderNumber(validNum);
                    setShowSetupModal(false);
                    setIsEditingNumber(false);
                    openWhatsApp();
                } else {
                    showToast('Failed to save number: ' + res.error, 'error');
                }
            } catch (err) {
                console.error('Error in saveSetting:', err);
                showToast('Error saving settings', 'error');
            }
        } else {
            console.error('window.api is not defined');
        }
    };

    const openWhatsApp = () => {
        if (!order.customer_phone) return;

        // Format customer phone
        let customerPhone = order.customer_phone.replace(/\D/g, '');
        if (customerPhone.startsWith('03')) {
            customerPhone = '92' + customerPhone.substring(1);
        }

        const message = getWhatsAppMessage(order, order.status);
        const url = `https://wa.me/${customerPhone}?text=${message}`;
        window.open(url, '_blank');
        setShowConfirmModal(false);
        showToast('WhatsApp opened!', 'success');
    };

    const handleChangeNumber = () => {
        setInputNumber(senderNumber || '');
        setIsEditingNumber(true);
        setShowConfirmModal(false);
        setShowSetupModal(true);
    };

    if (order.type === 'Dine-in') return null;

    return (
        <>
            <button
                onClick={handleInitialClick}
                disabled={!order.customer_phone}
                className={`p-2 bg-white border border-gray-200 rounded-lg transition-colors ${!order.customer_phone
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-green-50'
                    }`}
                title={!order.customer_phone ? 'Customer phone required' : 'Send WhatsApp Update'}
            >
                <MessageSquare size={16} className={!order.customer_phone ? 'text-gray-400' : 'text-green-600'} />
            </button>

            {/* Setup / Edit Modal */}
            {showSetupModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2">
                            {isEditingNumber ? 'Update Business Number' : 'WhatsApp Setup'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Enter your business WhatsApp number. This will be used to send updates.
                        </p>

                        <input
                            type="text"
                            value={inputNumber}
                            onChange={(e) => setInputNumber(e.target.value)}
                            placeholder="03001234567"
                            className="w-full p-2 border rounded-lg mb-4 text-lg font-mono focus:ring-2 focus:ring-green-500 outline-none"
                            autoFocus
                        />

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setShowSetupModal(false); setIsEditingNumber(false); }}
                                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveAndSend}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                            >
                                Save & Send
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* Confirmation Modal */}
            {showConfirmModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">Send via WhatsApp?</h3>

                        <div className="bg-gray-50 p-3 rounded-lg mb-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs text-gray-500 block">Sending from:</span>
                                <span className="font-mono font-medium">{senderNumber}</span>
                            </div>
                            <button
                                onClick={handleChangeNumber}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                                title="Change Number"
                            >
                                <Settings size={16} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={openWhatsApp}
                                className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold flex items-center justify-center gap-2"
                            >
                                <MessageSquare size={18} />
                                Yes, Send Message
                            </button>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="w-full py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}
        </>
    );
};

export default WhatsAppButton;
