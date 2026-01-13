import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface ChangePinDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangePinDialog({ isOpen, onClose }: ChangePinDialogProps) {
    const { changePin } = useAuth();
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
        setError(null);
        setStep('form');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPin !== confirmPin) {
            setError('New PINs do not match');
            return;
        }

        if (newPin.length < 4) {
            setError('PIN must be at least 4 digits');
            return;
        }

        setIsLoading(true);
        try {
            await changePin(oldPin, newPin);
            setStep('success');
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err: any) {
            if (err.message === 'old-pin-incorrect') {
                setError('Current PIN is incorrect');
            } else {
                setError('Failed to change PIN. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Change PIN</h3>
                    <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {step === 'success' ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">PIN Changed!</h4>
                            <p className="text-gray-500">Your PIN has been updated successfully.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Current PIN</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={oldPin}
                                        onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter current PIN"
                                        required
                                        maxLength={6}
                                        inputMode="numeric"
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">New PIN</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter new 4-digit PIN"
                                        required
                                        maxLength={6}
                                        minLength={4}
                                        inputMode="numeric"
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Confirm New PIN</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={confirmPin}
                                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Confirm new PIN"
                                        required
                                        maxLength={6}
                                        minLength={4}
                                        inputMode="numeric"
                                        className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${newPin && confirmPin && newPin !== confirmPin ? 'border-red-300' : 'border-gray-200'}`}
                                    />
                                </div>
                                {newPin && confirmPin && newPin !== confirmPin && (
                                    <p className="text-xs text-red-500">PINs do not match</p>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                disabled={isLoading || !oldPin || !newPin || !confirmPin || newPin !== confirmPin}
                                isLoading={isLoading}
                            >
                                Update PIN
                            </Button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
