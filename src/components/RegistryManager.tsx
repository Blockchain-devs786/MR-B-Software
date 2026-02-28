import { useState, useEffect } from 'react';
import { Clock, Play, Square } from 'lucide-react';
import { useToast } from './Toast';

const RegistryManager = () => {
    const [currentRegistry, setCurrentRegistry] = useState<any>(null);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [openingCash, setOpeningCash] = useState('');
    const { showToast } = useToast();

    const fetchCurrentRegistry = async () => {
        if (window.api) {
            const res = await window.api.getCurrentRegistry();
            if (res.success) {
                setCurrentRegistry(res.data);
            }
        }
    };

    useEffect(() => {
        fetchCurrentRegistry();
        // Refresh every 30 seconds
        const interval = setInterval(fetchCurrentRegistry, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleStartRegistry = async () => {
        const cashAmount = openingCash === '' || openingCash === null || openingCash === undefined 
            ? 0.00 
            : Number(openingCash);
        
        if (isNaN(cashAmount) || cashAmount < 0) {
            showToast('Please enter a valid opening cash amount (0.00 or more)');
            return;
        }

        if (window.api) {
            const res = await window.api.startRegistry({ opening_cash: cashAmount });
            if (res.success) {
                setShowStartModal(false);
                setOpeningCash('');
                fetchCurrentRegistry();
                showToast('Registry started successfully!', 'success');
            } else {
                showToast(res.error || 'Failed to start registry');
            }
        }
    };

    const handleCloseRegistry = async () => {
        if (window.api) {
            const res = await window.api.closeRegistry({});
            if (res.success) {
                setShowCloseModal(false);
                setCurrentRegistry(null);
                showToast('Registry closed successfully! Closing balance was calculated automatically.', 'success');
            } else {
                showToast(res.error || 'Failed to close registry');
            }
        }
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return 'N/A';
        const date = new Date(timeStr);
        return date.toLocaleString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDuration = () => {
        if (!currentRegistry || !currentRegistry.start_time) return 'N/A';
        const start = new Date(currentRegistry.start_time);
        const end = currentRegistry.end_time ? new Date(currentRegistry.end_time) : new Date();
        const diff = end.getTime() - start.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                {!currentRegistry ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-3 rounded-lg">
                                <Clock size={24} className="text-gray-400" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">No Active Registry</div>
                                <div className="text-sm text-gray-500">Start a new day to begin tracking</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowStartModal(true)}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Play size={18} /> Start Day
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-3 rounded-lg">
                                    <Clock size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">Registry Active</div>
                                    <div className="text-sm text-gray-500">
                                        Started: {formatTime(currentRegistry.start_time)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Time: {new Date(currentRegistry.start_time).toLocaleTimeString('en-PK', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Duration: {getDuration()}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCloseModal(true)}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                <Square size={18} /> Stop
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Opening Cash</div>
                                <div className="font-bold text-gray-900">Rs. {Number(currentRegistry.opening_cash || 0).toFixed(0)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Status</div>
                                <div className="font-bold text-green-600">{currentRegistry.status}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Registry ID</div>
                                <div className="font-bold text-gray-900">#{currentRegistry.id}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Start Registry Modal */}
            {showStartModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">Start New Registry</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Opening Cash in Hand (Rs.)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={openingCash}
                                    onChange={e => setOpeningCash(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setShowStartModal(false); setOpeningCash(''); }}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartRegistry}
                                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                                >
                                    Start Registry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Registry Modal - closing balance is auto-calculated (opening + gross sale - expenses) */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">Close Registry</h3>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm text-gray-500">Registry Started</div>
                                <div className="font-bold">{formatTime(currentRegistry?.start_time)}</div>
                            </div>
                            <p className="text-sm text-gray-600">
                                Closing balance will be calculated automatically: Opening + Gross Sale − Expenses.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowCloseModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCloseRegistry}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
                                >
                                    Close Registry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default RegistryManager;
