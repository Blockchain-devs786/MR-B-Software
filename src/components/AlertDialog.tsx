import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    type?: 'alert' | 'confirm' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
}

const AlertDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'alert',
    confirmText = 'OK',
    cancelText = 'Cancel'
}: AlertDialogProps) => {
    if (!isOpen) return null;

    const isConfirm = type === 'confirm';
    const hasConfirm = isConfirm && onConfirm;

    const getIcon = () => {
        switch (type) {
            case 'confirm':
            case 'alert':
                return <AlertTriangle size={24} className="text-orange-500" />;
            case 'info':
                return <Info size={24} className="text-blue-500" />;
            case 'success':
                return <CheckCircle size={24} className="text-green-500" />;
            default:
                return <AlertTriangle size={24} className="text-orange-500" />;
        }
    };

    const getConfirmButtonColor = () => {
        switch (type) {
            case 'confirm':
            case 'alert':
                return 'bg-red-500 hover:bg-red-600';
            case 'info':
                return 'bg-blue-500 hover:bg-blue-600';
            case 'success':
                return 'bg-green-500 hover:bg-green-600';
            default:
                return 'bg-orange-500 hover:bg-orange-600';
        }
    };

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 mt-1">
                        {getIcon()}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                        <p className="text-gray-600">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                    {hasConfirm && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`px-4 py-2 text-white rounded-lg font-medium ${getConfirmButtonColor()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertDialog;
