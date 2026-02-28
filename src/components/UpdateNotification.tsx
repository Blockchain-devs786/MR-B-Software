import { useState, useEffect } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

const UpdateNotification = () => {
    const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [updateReady, setUpdateReady] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!window.api) return;

        window.api.onUpdateAvailable?.((info: any) => {
            setUpdateInfo(info);
            setDismissed(false);
        });

        window.api.onUpdateDownloadProgress?.((progress: any) => {
            setDownloadProgress(progress.percent);
        });

        window.api.onUpdateDownloaded?.((info: any) => {
            setUpdateInfo(info);
            setUpdateReady(true);
            setDownloadProgress(null);
            setDismissed(false);
        });
    }, []);

    const handleInstall = () => {
        window.api?.installUpdate?.();
    };

    if (dismissed || (!updateInfo && downloadProgress === null)) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-80 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${updateReady ? 'bg-green-100' : 'bg-blue-100'}`}>
                            {updateReady ? (
                                <RefreshCw size={16} className="text-green-600" />
                            ) : (
                                <Download size={16} className="text-blue-600" />
                            )}
                        </div>
                        <span className="font-bold text-sm text-gray-900">
                            {updateReady ? 'Update Ready!' : 'Updating...'}
                        </span>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Content */}
                {updateReady ? (
                    <>
                        <p className="text-xs text-gray-500 mb-3">
                            Version <span className="font-semibold text-gray-700">{updateInfo?.version}</span> is ready. Restart to apply.
                        </p>
                        <button
                            onClick={handleInstall}
                            className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <RefreshCw size={14} />
                            Restart & Update
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-gray-500 mb-2">
                            Downloading version <span className="font-semibold text-gray-700">{updateInfo?.version}</span>...
                        </p>
                        {downloadProgress !== null && (
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${downloadProgress}%` }}
                                />
                            </div>
                        )}
                        {downloadProgress !== null && (
                            <p className="text-[10px] text-gray-400 mt-1 text-right">{downloadProgress}%</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UpdateNotification;
