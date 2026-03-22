const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/auth/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Firebase imports
content = content.replace(
    `import { useAuth } from '@/lib/auth-context';`,
    `import { useAuth } from '@/lib/auth-context';\nimport { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';\nimport { auth } from '@/lib/firebase';`
);

// 2. Add new states
const stateInjectionPoint = `const fileInputRef = useRef<HTMLInputElement>(null);`;
const stateInjectionStr = `    const fileInputRef = useRef<HTMLInputElement>(null);

    // SMS Verification State
    const [smsCode, setSmsCode] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [isSendingSms, setIsSendingSms] = useState(false);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    useEffect(() => {
        if (!recaptchaVerifierRef.current && typeof window !== 'undefined') {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible'
            });
        }
        return () => {
            if (recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current.clear();
                recaptchaVerifierRef.current = null;
            }
        };
    }, []);`;
content = content.replace(stateInjectionPoint, stateInjectionStr);

// 3. Update useAuth to include new methods
content = content.replace(
    `const { login, signup, checkPhoneExists, checkOrgCode, isLoading, user } = useAuth();`,
    `const { login, signup, checkPhoneExists, checkOrgCode, sendSmsVerification, resetPinWithSms, isLoading, user } = useAuth();`
);

// 4. Update Handle Login (6-digit check)
content = content.replace(
    `if (pinToUse.length !== 4) return;`,
    `if (pinToUse.length !== 6) return;`
);

// 5. Signup handler modifications
content = content.replace(
    `try {
            let userId = user?.id;
            if (!userId) {
                try {
                    userId = await signup(fullPhone, pin);
                } catch (error: any) {`,
    `try {
            let userId = user?.id;
            if (!userId) {
                try {
                    if (!confirmationResult) throw new Error('No SMS verification found');
                    userId = await signup(fullPhone, pin, confirmationResult, smsCode);
                } catch (error: any) {`
);

// 6. Handle Back for new steps
content = content.replace(
    `            if (step === 2 && pinStep === 'confirm') {`,
    `            if (step === 2 && pinStep === 'confirm') { // pin step is actually 3 now, but we'll fix step numbers later
`
);

// Actually, I should just modify the `handleBack` logic fully
content = content.replace(
    `    const handleBack = () => {
        setError(null);
        if (step > 0) {
            if (step === 2 && pinStep === 'confirm') {
                setPinStep('create');
                setConfirmPin('');
                return;
            }
            if (step === 1) {
                 if (!showOrgDetails && isJoiningOrg) {
                      setShowOrgDetails(true);
                      return;
                 } else {
                      setStep(0);
                      setRegistrationType(null);
                      setIsJoiningOrg(false);
                      setShowOrgDetails(false);
                      return;
                 }
            }
            setStep(step - 1);
        } else if (mode === 'signup') {
            setRegistrationType(null);
            setIsJoiningOrg(false);
            setShowOrgDetails(false);
        }
    };`,
    `    const handleBack = () => {
        setError(null);
        if (mode === 'forgot_pin') {
            if (step === 3 && pinStep === 'confirm') {
                setPinStep('create');
                setConfirmPin('');
                return;
            }
            if (step > 1) {
                setStep(step - 1);
            } else {
                setMode('login');
                setStep(0);
            }
            return;
        }

        if (step > 0) {
            if (step === 3 && pinStep === 'confirm') {
                setPinStep('create');
                setConfirmPin('');
                return;
            }
            if (step === 1) {
                 if (!showOrgDetails && isJoiningOrg) {
                      setShowOrgDetails(true);
                      return;
                 } else {
                      setStep(0);
                      setRegistrationType(null);
                      setIsJoiningOrg(false);
                      setShowOrgDetails(false);
                      return;
                 }
            }
            setStep(step - 1);
        } else if (mode === 'signup') {
            setRegistrationType(null);
            setIsJoiningOrg(false);
            setShowOrgDetails(false);
        }
    };`
);

// 7. Update step tracking for display
content = content.replace(
    `    const getTotalDisplaySteps = () => {
        if (registrationType === 'waste_owner') return 3; // phone, pin, profile
        return 6; // org, phone, pin, profile, vehicle, waste types
    };

    const getCurrentDisplayStep = () => {
        if (registrationType === 'waste_owner') return step;
        if (step === 1 && showOrgDetails) return 1;
        if (step === 1 && !showOrgDetails) return 2;
        return step + 1;
    };`,
    `    const getTotalDisplaySteps = () => {
        if (mode === 'forgot_pin') return 3; // phone, sms, pin
        if (registrationType === 'waste_owner') return 4; // phone, sms, pin, profile
        return 7; // org, phone, sms, pin, profile, vehicle, waste types
    };

    const getCurrentDisplayStep = () => {
        if (mode === 'forgot_pin') return step;
        if (registrationType === 'waste_owner') return step;
        if (step === 1 && showOrgDetails) return 1;
        if (step === 1 && !showOrgDetails) return 2;
        return step + 1;
    };`
);

// 8. Add forgot pin mode & update login dialpad to 6
content = content.replace(
    `const [mode, setMode] = useState<'login' | 'signup'>`,
    `const [mode, setMode] = useState<'login' | 'signup' | 'forgot_pin'>`
);

content = content.replace(
    `                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={\`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all \${
                                        loginPin[i] `,
    `                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className={\`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all \${
                                        loginPin[i] `
);

content = content.replace(
    `                                onChange={(val) => {
                                    setLoginPin(val);
                                    setError(null);
                                    if (val.length === 4) {
                                        handleLogin(undefined, val); // auto-submit when 4 digits
                                    }
                                }}
                                maxLength={4}`,
    `                                onChange={(val) => {
                                    setLoginPin(val);
                                    setError(null);
                                    if (val.length === 6) {
                                        handleLogin(undefined, val); // auto-submit when 6 digits
                                    }
                                }}
                                maxLength={6}`
);

// 9. Add forgot pin button to login
content = content.replace(
    `                        <div className="mt-8 text-center">
                            {isLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-900" />}
                        </div>`,
    `                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('forgot_pin');
                                    setStep(1);
                                    setLoginStep(0);
                                    setLoginPin('');
                                    setPhoneNumber('');
                                }}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                Forgot PIN?
                            </button>
                        </div>
                        <div className="mt-8 text-center">
                            {isLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-900" />}
                        </div>`
);

// 10. Update Step 1 Continue to trigger SMS
content = content.replace(
    `                        {/* Continue button */}
                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                setStep(2);
                            }}
                            disabled={phoneNumber.length < 7}
                            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-opacity mt-4"
                        >
                            Continue
                        </button>`,
    `                        {/* Continue button */}
                        <button
                            type="button"
                            onClick={async () => {
                                setError(null);
                                setIsSendingSms(true);
                                try {
                                    const fullPhone = \`\${country.dialCode} \${formatPhone(phoneNumber)}\`;
                                    if (mode === 'signup') {
                                        const exists = await checkPhoneExists(fullPhone);
                                        if (exists) {
                                            setError('This phone number is already registered. Please log in instead.');
                                            setIsSendingSms(false);
                                            return;
                                        }
                                    }
                                    
                                    if (!recaptchaVerifierRef.current) {
                                        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                                            size: 'invisible'
                                        });
                                    }
                                    
                                    const result = await sendSmsVerification(fullPhone, recaptchaVerifierRef.current);
                                    setConfirmationResult(result);
                                    setStep(2);
                                } catch (err: any) {
                                    console.error(err);
                                    setError(err.message || 'Failed to send SMS');
                                    if (recaptchaVerifierRef.current) {
                                        recaptchaVerifierRef.current.clear();
                                        recaptchaVerifierRef.current = null;
                                    }
                                } finally {
                                    setIsSendingSms(false);
                                }
                            }}
                            disabled={phoneNumber.length < 7 || isSendingSms}
                            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-opacity mt-4"
                        >
                            {isSendingSms ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Continue'}
                        </button>`
);

// 11. Inject Step 2: SMS Code step before PIN Creation
content = content.replace(
    `                {/* ==========================================
                    STEP 2: PIN Creation (Dial Pad)
                ========================================== */}
                {step === 2 && (`,
    `                {/* ==========================================
                    STEP 2: SMS Code Verification
                ========================================== */}
                {step === 2 && (
                    <motion.div
                        key="sms"
                        variants={pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="flex-1 flex flex-col px-6 pb-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Enter Verification Code</h2>
                        <p className="text-gray-500 text-sm mb-6">We sent a 6-digit code to {formatPhone(phoneNumber)}</p>

                        <div className="flex gap-3 justify-center mb-8">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className={\`w-12 h-14 rounded-2xl border-2 flex items-center justify-center transition-all text-xl font-bold \${
                                        smsCode[i] 
                                            ? 'border-gray-900 bg-white text-gray-900' 
                                            : error 
                                                ? 'border-red-300 bg-red-50'
                                                : 'border-gray-200 bg-gray-50'
                                    }\`}
                                >
                                    {smsCode[i] || ''}
                                </div>
                            ))}
                        </div>

                        <div className="flex-1 flex items-center">
                            <DialPad
                                value={smsCode}
                                onChange={(val) => {
                                    setSmsCode(val);
                                    setError(null);
                                    if (val.length === 6) {
                                        setStep(3);
                                    }
                                }}
                                maxLength={6}
                                showLetters={false}
                            />
                        </div>
                    </motion.div>
                )}

                {/* ==========================================
                    STEP 3: PIN Creation (Dial Pad)
                ========================================== */}
                {step === 3 && (`
);

// 12. Adjust Step 2 (now Step 3) to handle 6-digit PIN and Next
content = content.replace(
    `                                ? 'Choose a 4-digit PIN for quick sign in'`,
    `                                ? 'Choose a 6-digit PIN for quick sign in'`
);
content = content.replace(
    `                            {[0, 1, 2, 3].map((i) => {`,
    `                            {[0, 1, 2, 3, 4, 5].map((i) => {`
);
content = content.replace(
    `                                        className={\`w-4 h-4 rounded-full transition-colors \${`,
    `                                        className={\`w-3 h-3 rounded-full transition-colors \${`
);

content = content.replace(
    `                                onChange={(val) => {
                                    if (pinStep === 'create') {
                                        setPin(val);
                                        if (val.length === 4) {
                                            setTimeout(() => setPinStep('confirm'), 300);
                                        }
                                    } else {
                                        setConfirmPin(val);
                                        if (val.length === 4) {
                                            if (val === pin) {
                                                setTimeout(() => setStep(3), 300);
                                            } else {
                                                setError('PINs do not match. Please try again.');
                                                setConfirmPin('');
                                                setPinStep('create');
                                                setPin('');
                                            }
                                        }
                                    }
                                }}
                                maxLength={4}`,
    `                                onChange={async (val) => {
                                    if (pinStep === 'create') {
                                        setPin(val);
                                        if (val.length === 6) {
                                            setTimeout(() => setPinStep('confirm'), 300);
                                        }
                                    } else {
                                        setConfirmPin(val);
                                        if (val.length === 6) {
                                            if (val === pin) {
                                                if (mode === 'forgot_pin') {
                                                    try {
                                                        if (!confirmationResult) throw new Error('No SMS verification found');
                                                        await resetPinWithSms(pin, confirmationResult, smsCode);
                                                        window.location.href = '/dashboard';
                                                    } catch (err: any) {
                                                        setError(err.message || 'Failed to reset PIN');
                                                    }
                                                } else {
                                                    setTimeout(() => setStep(4), 300);
                                                }
                                            } else {
                                                setError('PINs do not match. Please try again.');
                                                setConfirmPin('');
                                                setPinStep('create');
                                                setPin('');
                                            }
                                        }
                                    }
                                }}
                                maxLength={6}`
);

// Shift steps 3, 4, 5 -> 4, 5, 6
content = content.replace(`{step === 3 && (`, `{step === 4 && (`);
content = content.replace(`{step === 4 && (`, `{step === 5 && (`);
content = content.replace(`{step === 5 && (`, `{step === 6 && (`);
// adjust button continues
content = content.replace(`setStep(4);`, `setStep(5);`);
content = content.replace(`setStep(5)}`, `setStep(6)}`);

// 13. Add recaptcha-container
content = content.replace(
    `<AnimatePresence mode="wait">`,
    `<div id="recaptcha-container"></div>\n            <AnimatePresence mode="wait">`
);

fs.writeFileSync(filePath, content);
console.log('Done modifying app/auth/page.tsx');