import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Mail, ShieldCheck, User } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onGoToDashboard?: () => void;
}

// Helper to extract clean error message from auth responses
const formatSupabaseAuthError = (error: any): string => {
  if (!error) return 'An unexpected authentication error occurred.';
  
  let errObj: any = error;
  if (typeof error === 'string') {
    try {
      errObj = JSON.parse(error);
    } catch {
      errObj = { message: error };
    }
  }

  const name = errObj?.name || '';
  const status = errObj?.status;
  const rawMsg = errObj?.message || errObj?.error_description || errObj?.msg || '';

  // Handle server 500 / AuthRetryableFetchError
  if (name === 'AuthRetryableFetchError' || status === 500 || (typeof rawMsg === 'string' && rawMsg.includes('AuthRetryableFetchError'))) {
    return 'Authentication service returned a 500 error. The default email service may be rate-limited or unavailable. Try signing in with Google or try again in a few minutes.';
  }

  let msg = typeof rawMsg === 'string' ? rawMsg : '';
  if (!msg || msg === '{}' || msg === '[]') {
    try {
      const str = JSON.stringify(errObj);
      if (str && str !== '{}' && str !== '[]') {
        if (str.includes('AuthRetryableFetchError') || str.includes('500')) {
          return 'Authentication service returned a server error (500). Please try signing in with Google or try again shortly.';
        }
        msg = str;
      }
    } catch {}
  }

  if (!msg || msg === '{}') {
    return 'Authentication request failed. Please check your connection or try signing in with Google.';
  }

  const lower = msg.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('security purposes') || lower.includes('over_email_send_rate_limit')) {
    return 'Default email rate limit reached (3 emails/hr). Please configure custom SMTP or sign in with Google.';
  }
  if (lower.includes('disabled') || lower.includes('not allowed')) {
    return 'Email OTP sign-in is disabled in auth settings. Please enable Email Provider in project settings.';
  }

  return msg;
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, onGoToDashboard }) => {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    id?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    provider?: string;
    lastSignIn?: string;
  } | null>(null);

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
          const user = data.session.user;
          setUserProfile({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            provider: user.app_metadata?.provider || 'Google / Email',
            lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Active',
          });
          setStep('success');
        }
      });
    }

    // Subscribe to auth state changes (e.g. after Google OAuth redirect callback)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const user = session.user;
        setUserProfile({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          provider: user.app_metadata?.provider || 'Google / Email',
          lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Active',
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

  // Handle Google OAuth Sign In (Same-tab redirect to avoid opening duplicate tabs)
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage('Authentication is not configured yet. Please check environment variables in .env.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setLoading(false);
        if (error.message?.includes('provider is not enabled') || (error as any).code === 400) {
          setErrorMessage('Google Sign-In is not enabled in auth settings yet. Please use Email OTP below.');
        } else {
          setErrorMessage(error.message || 'Failed to connect to Google. Please try email verification.');
        }
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'Google authentication failed.');
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
        setErrorMessage(formatSupabaseAuthError(error));
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
        setUserProfile({
          id: 'usr_' + Math.random().toString(36).substring(2, 10),
          email,
          name: email.split('@')[0],
          provider: 'Email Passkey (Demo)',
          lastSignIn: new Date().toLocaleString(),
        });
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
        setErrorMessage(formatSupabaseAuthError(error) || 'Invalid or expired code. Please request a new passkey.');
      } else if (data.session?.user) {
        const u = data.session.user;
        setUserProfile({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture,
          provider: 'Email Passkey',
          lastSignIn: new Date().toLocaleString(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-[480px] p-8 md:p-12 mx-4 border border-[#262626] rounded-2xl bg-[#000000] shadow-2xl flex flex-col z-10 text-white">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#8e9192] hover:text-white hover:bg-[#1a1a1a] transition-colors rounded-lg"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <header className="mb-8 text-center">
          <h1 className={`font-display font-extrabold tracking-tight text-white uppercase mb-3 ${
            step === 'success' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'
          }`}>
            {step === 'success' ? 'AUTHORIZED' : 'SAKIDO'}
          </h1>
          <p className="font-body-lg text-sm text-[#c4c7c8]">
            {step === 'email' && 'Get started to continue.'}
            {step === 'otp' && `Enter 6-digit passkey sent to ${email}`}
            {step === 'success' && 'Identity verified and session established.'}
          </p>
        </header>

        {/* Status Error / Info Messages */}
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-red-950/60 border border-red-800/80 rounded-none flex items-start gap-2.5 text-red-200 text-xs font-mono leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-3.5 bg-[#171717] border border-[#262626] rounded-none flex items-start gap-2.5 text-zinc-300 text-xs font-mono leading-relaxed">
            <Mail className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="mb-6 p-3 bg-[#171717] border border-[#262626] text-xs text-[#8e9192] font-mono leading-relaxed">
            <span className="font-semibold text-white block mb-1">Local Development Notice:</span>
            Authentication is in preview mode. Passkeys and OAuth redirect safely within session state.
          </div>
        )}

        {/* Auth Actions Section */}
        <section className="flex flex-col gap-6 w-full">
          {/* STEP 1: EMAIL ENTRY & GOOGLE OAUTH */}
          {step === 'email' && (
            <>
              {/* Google OAuth Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 border border-[#262626] bg-transparent hover:bg-white hover:text-[#000000] text-white font-label-md text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors duration-200 group disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <div className="flex items-center gap-4">
                <hr className="flex-grow border-t border-[#262626]" />
                <span className="font-label-sm text-xs text-[#8e9192] uppercase tracking-widest">OR</span>
                <hr className="flex-grow border-t border-[#262626]" />
              </div>

              {/* Email Input Form */}
              <form onSubmit={handleSendOtp} className="flex flex-col gap-6 w-full">
                <div className="flex flex-col gap-2 text-left">
                  <label className="font-label-sm text-xs text-[#c4c7c8] uppercase tracking-wider font-medium" htmlFor="email-input">
                    Email Address
                  </label>
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@example.com"
                    required
                    className="w-full bg-transparent border border-[#262626] focus:border-white focus:ring-0 text-white font-body-md text-sm py-3 px-4 outline-none transition-colors duration-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-4 px-6 bg-white text-[#000000] font-label-md text-xs sm:text-sm font-bold tracking-wider uppercase hover:bg-[#E5E5E5] transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Sending code...</span>
                    </>
                  ) : (
                    <span>Send Code</span>
                  )}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6 w-full">
              <div className="flex flex-col gap-2 text-left">
                <label className="font-label-sm text-xs text-[#c4c7c8] uppercase tracking-wider font-medium">
                  6-Digit Passkey
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
                      className="w-11 h-12 text-center text-xl font-mono font-bold bg-transparent border border-[#262626] text-white focus:outline-none focus:border-white transition-all"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.join('').length !== 6}
                className="w-full py-4 px-6 bg-white text-[#000000] font-label-md text-xs sm:text-sm font-bold tracking-wider uppercase hover:bg-[#E5E5E5] transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Code</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between font-label-sm text-xs text-[#8e9192] pt-1">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="hover:text-white uppercase tracking-wider transition-colors"
                >
                  Change email
                </button>
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading}
                  className="hover:text-white uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESSFUL AUTH STATE */}
          {step === 'success' && (
            <div className="flex flex-col gap-5 text-left">
              <div className="flex items-center justify-start">
                <div className="w-14 h-14 rounded-full bg-black border border-[#444748] flex items-center justify-center text-white overflow-hidden shrink-0 shadow-inner">
                  {userProfile?.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile.name || 'User Profile'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-7 h-7 text-white" />
                  )}
                </div>
              </div>

              <div className="border-t border-[#444748] pt-3.5">
                <span className="font-label-sm text-[11px] text-[#c4c7c8] uppercase block mb-1">Authenticated Account</span>
                <span className="font-display font-bold text-base sm:text-lg text-white break-all">{userProfile?.email || 'user@example.com'}</span>
              </div>

              <div className="border-t border-[#444748] pt-3.5">
                <span className="font-label-sm text-[11px] text-[#c4c7c8] uppercase block mb-1">User ID</span>
                <span className="font-label-md text-xs sm:text-sm font-mono text-white/90 break-all select-all">{userProfile?.id || 'usr_active_session'}</span>
              </div>

              <div className="border-t border-[#444748] pt-3.5 flex items-center justify-between">
                <div>
                  <span className="font-label-sm text-[11px] text-[#c4c7c8] uppercase block mb-0.5">Method</span>
                  <span className="font-label-md text-xs text-white capitalize">{userProfile?.provider || 'Email OTP'}</span>
                </div>
                <div className="text-right">
                  <span className="font-label-sm text-[11px] text-[#c4c7c8] uppercase block mb-0.5">Status</span>
                  <span className="font-label-md text-xs text-emerald-400 font-semibold tracking-wider">VERIFIED</span>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onGoToDashboard) {
                      onGoToDashboard();
                    }
                  }}
                  className="w-full sm:flex-1 py-3.5 px-6 bg-white text-black font-label-md text-xs sm:text-sm font-bold tracking-widest uppercase hover:bg-[#E5E5E5] transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <span>GO TO DASHBOARD</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full sm:w-auto py-3.5 px-6 border border-[#262626] bg-transparent hover:bg-[#1a1a1a] text-[#c4c7c8] hover:text-white font-label-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Footer / Legal Info */}
        <footer className="mt-12 pt-6 border-t border-[#262626] flex flex-col gap-2 text-center">
          <p className="font-label-sm text-xs text-[#c4c7c8]">
            By continuing, you agree to our{' '}
            <a className="text-white hover:underline" href="#">Terms</a> and{' '}
            <a className="text-white hover:underline" href="#">Privacy Policy</a>.
          </p>
        </footer>
      </div>
    </div>
  );
};
