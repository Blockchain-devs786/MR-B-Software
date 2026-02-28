import { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Loader, Sparkles, Shield, Clock, Zap } from 'lucide-react';
import { useToast } from './Toast';

const LicenseScreen = () => {
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [licenseStatus, setLicenseStatus] = useState<{ valid: boolean; license: any } | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        checkLicenseStatus();
    }, []);

    const checkLicenseStatus = async () => {
        if (window.api) {
            try {
                const result = await window.api.checkLicense();
                if (result.success) {
                    setLicenseStatus({ valid: result.valid, license: result.license });
                }
            } catch (error) {
                console.error('Error checking license:', error);
            }
        }
    };

    const handleSendRequest = async () => {
        if (!window.api) return;
        
        setLoading(true);
        try {
            const result = await window.api.sendLicenseRequest();
            if (result.success) {
                showToast('License request sent successfully! Please wait for a reply.', 'success');
            } else {
                showToast('Failed to send license request: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error: any) {
            showToast('Error sending request: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckReply = async () => {
        if (!window.api) return;
        
        setChecking(true);
        try {
            const result = await window.api.checkLicenseReply();
            if (result.success && result.days) {
                showToast(`License activated for ${result.days} days!`, 'success');
                await checkLicenseStatus();
                // Reload the app after a short delay to show main interface
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showToast(result.error || 'No valid license reply found. Please try again later.', 'error');
            }
        } catch (error: any) {
            showToast('Error checking for reply: ' + error.message, 'error');
        } finally {
            setChecking(false);
        }
    };

    const getDaysRemaining = () => {
        if (!licenseStatus?.license) return 0;
        const expiresAt = new Date(licenseStatus.license.expiresAt);
        const now = new Date();
        const diff = expiresAt.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-lg p-8 md:p-10 relative z-10 border border-white/20">
                {/* Decorative top border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 rounded-t-3xl"></div>

                {/* Header with animated icon */}
                <div className="text-center mb-8">
                    <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-orange-400 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                        <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full shadow-lg transform hover:scale-110 transition-transform duration-300">
                            <Shield className="w-12 h-12 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1">
                            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-3">
                        License Required
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Please request a license to continue using this application
                    </p>
                </div>

                {/* License Status Card */}
                {licenseStatus?.license && (
                    <div className={`mb-8 p-5 rounded-2xl border-2 shadow-lg transform transition-all duration-300 ${
                        licenseStatus.valid 
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
                            : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300'
                    }`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-full ${
                                licenseStatus.valid ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                {licenseStatus.valid ? (
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-red-600" />
                                )}
                            </div>
                            <div className="flex-1">
                                <span className={`font-bold text-lg ${
                                    licenseStatus.valid ? 'text-green-800' : 'text-red-800'
                                }`}>
                                    {licenseStatus.valid ? 'License Active' : 'License Expired'}
                                </span>
                            </div>
                        </div>
                        {licenseStatus.valid && (
                            <div className="flex items-center gap-2 text-green-700">
                                <Clock className="w-4 h-4" />
                                <span className="font-semibold">
                                    {getDaysRemaining()} day{getDaysRemaining() !== 1 ? 's' : ''} remaining
                                </span>
                            </div>
                        )}
                        {!licenseStatus.valid && (
                            <p className="text-sm text-red-700 font-medium">
                                License expired. Please request a new license.
                            </p>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-4 mb-6">
                    <button
                        onClick={handleSendRequest}
                        disabled={loading}
                        className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-orange-300 disabled:to-amber-300 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin" />
                                <span>Sending Request...</span>
                            </>
                        ) : (
                            <>
                                <Mail className="w-5 h-5 group-hover:animate-bounce" />
                                <span>Send License Request</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleCheckReply}
                        disabled={checking}
                        className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-blue-300 disabled:to-cyan-300 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed"
                    >
                        {checking ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin" />
                                <span>Checking for Reply...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                <span>Check for Reply</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Info Card */}
                <div className="p-5 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200 shadow-inner">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Zap className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                <span className="font-semibold text-gray-900">How it works:</span>
                                <br />
                                After sending a request, please wait for a reply email. 
                                Then click <span className="font-semibold text-blue-600">"Check for Reply"</span> to activate your license.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer decoration */}
                <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-xs">
                    <Shield className="w-4 h-4" />
                    <span>Secure License Management</span>
                </div>
            </div>

            <style>{`
                @keyframes blob {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(30px, -50px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
};

export default LicenseScreen;
