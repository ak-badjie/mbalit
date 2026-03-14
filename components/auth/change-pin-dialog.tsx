import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DialPad } from '@/components/ui/dial-pad';

interface ChangePinDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

type PinStep = 'current' | 'newPin' | 'confirm' | 'success';

export function ChangePinDialog({ isOpen, onClose }: ChangePinDialogProps) {
    const { changePin } = useAuth();
    const [step, setStep] = useState<PinStep>('current');
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setError(null);
        setStep('current');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleBack = () => {
        setError(null);
        if (step === 'confirm') {
            setConfirmPin('');
            setStep('newPin');
        } else if (step === 'newPin') {
            setNewPin('');
            setStep('current');
        } else {
            handleClose();
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await changePin(currentPin, newPin);
            setStep('success');
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err: any) {
            if (err.message === 'old-pin-incorrect') {
                setError('Current PIN is incorrect');
                setCurrentPin('');
                setStep('current');
            } else {
                setError('Failed to change PIN. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinChange = (val: string, pinStep: PinStep) => {
        setError(null);

        if (pinStep === 'current') {
            setCurrentPin(val);
            if (val.length === 4) {
                setTimeout(() => setStep('newPin'), 200);
            }
        } else if (pinStep === 'newPin') {
            setNewPin(val);
            if (val.length === 4) {
                setTimeout(() => setStep('confirm'), 200);
            }
        } else if (pinStep === 'confirm') {
            setConfirmPin(val);
            if (val.length === 4) {
                if (val !== newPin) {
                    setError('PINs do not match');
                    setConfirmPin('');
                } else {
                    handleSubmit();
                }
            }
        }
    };

    const getTitle = () => {
        switch (step) {
            case 'current': return 'Enter Current PIN';
            case 'newPin': return 'Create New PIN';
            case 'confirm': return 'Confirm New PIN';
            case 'success': return 'PIN Changed!';
        }
    };

    const getSubtitle = () => {
        switch (step) {
            case 'current': return 'Enter your current 4-digit PIN';
            case 'newPin': return 'Choose a new 4-digit PIN';
            case 'confirm': return 'Enter your new PIN again';
            case 'success': return 'Your PIN has been updated successfully';
        }
    };

    const getCurrentValue = () => {
        switch (step) {
            case 'current': return currentPin;
            case 'newPin': return newPin;
            case 'confirm': return confirmPin;
            default: return '';
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-white flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center pt-14 px-6 mb-4">
                    {step !== 'success' && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleBack}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-900" />
                        </motion.button>
                    )}
                    <div className="flex-1 text-center font-semibold text-gray-900 pr-8">
                        Change PIN
                    </div>
                </div>

                {/* Step dots */}
                {step !== 'success' && (
                    <div className="flex items-center gap-2 justify-center mb-6">
                        {['current', 'newPin', 'confirm'].map((s, i) => (
                            <div
                                key={s}
                                className={`h-1.5 rounded-full transition-all ${
                                    ['current', 'newPin', 'confirm'].indexOf(step) >= i
                                        ? 'w-6 bg-gray-900'
                                        : 'w-1.5 bg-gray-200'
                                }`}
                            />
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 px-6 flex flex-col items-center justify-center pb-safe">
                    {step === 'success' ? (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                                <Check className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{getTitle()}</h1>
                            <p className="text-gray-500">{getSubtitle()}</p>
                        </motion.div>
                    ) : (
                        <>
                            <div className="text-center mb-10">
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">{getTitle()}</h1>
                                <p className="text-gray-500">{getSubtitle()}</p>
                            </div>

                            {error && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl w-full max-w-sm">
                                    <p className="text-sm text-red-600 text-center">{error}</p>
                                </div>
                            )}

                            {/* PIN dots */}
                            <div className="flex gap-4 justify-center mb-12">
                                {[0, 1, 2, 3].map((i) => {
                                    const val = getCurrentValue();
                                    return (
                                        <div
                                            key={i}
                                            className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                                                val[i]
                                                    ? 'border-gray-900 bg-gray-900'
                                                    : error
                                                        ? 'border-red-300 bg-red-50'
                                                        : 'border-gray-200 bg-gray-50'
                                            }`}
                                        >
                                            {val[i] ? (
                                                <div className="w-3 h-3 rounded-full bg-white" />
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* DialPad */}
                            <div className="w-full max-w-sm mx-auto">
                                <DialPad
                                    value={getCurrentValue()}
                                    onChange={(val) => handlePinChange(val, step)}
                                    maxLength={4}
                                    showLetters={true}
                                />
                            </div>

                            {isLoading && (
                                <div className="mt-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-900" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
