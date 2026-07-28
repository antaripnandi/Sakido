import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Mail, ShieldCheck, User } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ email?: string; name?: string } | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when opening/closing & listen for auth state changes
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Fetch initial session
    if (isOpen) {
      setErrorMessage(null);
      setInfoMessage(null);
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          setUserProfile({
            email: data.session.user.email,
            name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0],
          });
          setStep('success');
        }
      });
    }

    // Subscribe to auth state changes (e.g. after Google OAuth redirect callback)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserProfile({
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        });
        setStep('success');
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setStep('email');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage('Supabase is not configured yet. Please check environment variables in .env.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        if (error.message?.includes('provider is not enabled') || (error as any).code === 400) {
          setErrorMessage('Google Sign-In is not enabled in your Supabase Dashboard yet. Please go to Supabase > Authentication > Providers > Google to enable it, or use Email OTP below.');
        } else {
          setErrorMessage(error.message || 'Failed to connect to Google. Please try email verification.');
        }
        return;
      }

      if (data?.url) {
        // Opening in a new window/tab prevents Google's 403 X-Frame-Options error in iframe previews
        const newWindow = window.open(data.url, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          // If popup blocker intervened, direct navigation fallback
          window.location.href = data.url;
        } else {
          setInfoMessage('Google sign-in opened in a new tab. Please complete sign-in there.');
          // Poll for auth session completion while tab is open
          const checkInterval = setInterval(async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              clearInterval(checkInterval);
              setUserProfile({
                email: sessionData.session.user.email,
                name: sessionData.session.user.user_metadata?.full_name || sessionData.session.user.email?.split('@')[0],
              });
              setStep('success');
              if (onSuccess) onSuccess();
            }
            if (newWindow.closed) {
              clearInterval(checkInterval);
            }
          }, 1000);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Request Email OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    // Strict email validation
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      // Demo / fallback mode if Supabase environment is unpopulated
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStep('otp');
        setInfoMessage('Demo mode: A 6-digit OTP code (e.g. 123456) has been requested.');
      }, 600);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        if (error.message?.includes('rate limit')) {
          setErrorMessage('Supabase default email rate limit reached (3/hr). To fix this, enter Resend SMTP credentials in Supabase Dashboard > Authentication > SMTP Settings.');
        } else {
          setErrorMessage(`Supabase Auth Error: ${error.message}`);
        }
      } else {
        setStep('otp');
        setInfoMessage(`We've sent a 6-digit passkey to ${cleanEmail}`);
        // Focus first OTP box
        setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
      }
    } catch {
      setErrorMessage('Unable to process authentication request.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Single OTP digit input change
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric inputs
    const cleanDigit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...otpCode];
    newCode[index] = cleanDigit;
    setOtpCode(newCode);

    // Auto-advance focus to next field if a digit was typed
    if (cleanDigit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation in OTP boxes
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle Full Paste of 6-digit OTP code
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedText.length > 0) {
      const newCode = [...otpCode];
      for (let i = 0; i < Math.min(6, pastedText.length); i++) {
        newCode[i] = pastedText[i];
      }
      setOtpCode(newCode);
      // Focus last pasted input or last field
      const nextIndex = Math.min(5, pastedText.length);
      otpInputsRef.current[nextIndex]?.focus();
    }
  };

  // Verify OTP Code
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const token = otpCode.join('');
    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      setErrorMessage('Please enter all 6 digits of your passkey code.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      // Demo mode fallback
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setUserProfile({ email, name: email.split('@')[0] });
        setStep('success');
        if (onSuccess) onSuccess();
      }, 500);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: 'email',
      });

      if (error) {
        setErrorMessage('Invalid or expired code. Please request a new passkey.');
      } else if (data.session?.user) {
        setUserProfile({
          email: data.session.user.email,
          name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0],
        });
        setStep('success');
        if (onSuccess) onSuccess();
      }
    } catch {
      setErrorMessage('Authentication verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Sign out user session
  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUserProfile(null);
    setStep('email');
    setOtpCode(['', '', '', '', '', '']);
    setEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 sm:p-8 text-white">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Auth</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {step === 'success' ? 'Welcome to Sakido' : 'Get started'}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {step === 'email' && 'Sign in or create your account to sync your school workspace.'}
            {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
            {step === 'success' && 'Your account is verified and connected.'}
          </p>
        </div>

        {/* Status Error / Info Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800/50 rounded-xl flex items-start gap-2.5 text-red-200 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-start gap-2.5 text-zinc-300 text-xs leading-relaxed">
            <Mail className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="mb-5 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 leading-relaxed">
            <span className="font-semibold text-white block mb-1">Notice for local development:</span>
            Supabase URL & Publishable keys are currently using fallback settings. To enable live Resend email delivery & OAuth, provide environment variables in <code className="text-zinc-200 font-mono bg-zinc-950 px-1 py-0.5 rounded">.env</code>.
          </div>
        )}

        {/* STEP 1: EMAIL ENTRY & GOOGLE OAUTH */}
        {step === 'email' && (
          <div className="space-y-4">
            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-11 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-medium text-sm text-white flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative py-1 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800/80" />
              </div>
              <span className="relative px-3 bg-zinc-950 text-xs font-mono uppercase tracking-wider text-zinc-500">
                Or with email
              </span>
            </div>

            {/* Email Input Form */}
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label htmlFor="email-input" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  className="w-full h-11 px-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-11 px-4 bg-white hover:bg-zinc-200 text-black font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Sending code...</span>
                  </>
                ) : (
                  <>
                    <span>Send 6-digit code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">
                Enter 6-digit passkey code
              </label>
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-11 h-12 text-center text-xl font-mono font-bold bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.join('').length !== 6}
              className="w-full h-11 px-4 bg-white hover:bg-zinc-200 text-black font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify passkey</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1 text-zinc-400">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="hover:text-white underline underline-offset-4 transition-colors"
              >
                Change email
              </button>
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={loading}
                className="hover:text-white underline underline-offset-4 transition-colors disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESSFUL AUTH STATE */}
        {step === 'success' && (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 bg-emerald-950/60 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <User className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{userProfile?.name || 'Authenticated User'}</p>
              <p className="text-xs text-zinc-400 font-mono">{userProfile?.email}</p>
            </div>

            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-300 text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Status:</span>
                <span className="text-emerald-400 font-mono font-medium">Session Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Profile Row:</span>
                <span className="text-zinc-300 font-mono">Auto-created via Postgres Trigger</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex-1 h-10 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-xl transition-colors"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 px-3 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
