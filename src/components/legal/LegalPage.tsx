import React, { useState } from 'react';
import { Shield, FileText, Cookie, Mail, ArrowLeft, ExternalLink, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type LegalTab = 'terms' | 'privacy' | 'cookies' | 'contact';

interface LegalPageProps {
  initialTab?: LegalTab;
}

export const LegalPage: React.FC<LegalPageProps> = ({ initialTab = 'privacy' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  const handleTabChange = (tab: LegalTab) => {
    setActiveTab(tab);
    if (tab === 'terms') navigate('/terms');
    else if (tab === 'privacy') navigate('/privacy');
    else if (tab === 'cookies') navigate('/cookie-policy');
    else if (tab === 'contact') navigate('/contact');
  };

  const lastUpdated = 'July 29, 2026';
  const domainUrl = 'https://sakidoapp.vercel.app';
  const contactEmail = 'support@sakidoapp.vercel.app';

  return (
    <div className="min-h-screen bg-[#131313] text-[#e2e2e2] font-sans antialiased selection:bg-[#f4bb92] selection:text-[#131313] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[#2c241f] bg-[#131313]/90 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1c1613] border border-[#2c241f] text-[#c4c7c8] hover:text-white hover:bg-[#2c241f] transition-all text-xs font-mono font-medium cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sakido
            </button>
            <div className="h-4 w-px bg-[#2c241f] hidden sm:block" />
            <span className="font-syne font-bold text-sm text-[#e2e2e2] tracking-wide hidden sm:inline">
              Legal & Compliance Center
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#c4c7c8] font-mono bg-[#1c1613] border border-[#2c241f] px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Verified Domain: {domainUrl.replace('https://', '')}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <aside className="md:col-span-1 space-y-2">
          <div className="p-5 rounded-2xl bg-[#1c1613] border border-[#2c241f] mb-6 shadow-xs">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#f4bb92] font-bold mb-1">
              Document Index
            </h2>
            <p className="text-xs text-[#c4c7c8] font-manrope leading-relaxed">
              Official legal policies for Google Search Console & OAuth Compliance.
            </p>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => handleTabChange('privacy')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'privacy'
                  ? 'bg-[#f4bb92] text-[#1c1613] shadow-md font-bold'
                  : 'text-[#c4c7c8] hover:text-white hover:bg-[#1c1613]'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span className="font-syne tracking-wide">Privacy Policy</span>
            </button>

            <button
              onClick={() => handleTabChange('terms')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'terms'
                  ? 'bg-[#f4bb92] text-[#1c1613] shadow-md font-bold'
                  : 'text-[#c4c7c8] hover:text-white hover:bg-[#1c1613]'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="font-syne tracking-wide">Terms of Service</span>
            </button>

            <button
              onClick={() => handleTabChange('cookies')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'cookies'
                  ? 'bg-[#f4bb92] text-[#1c1613] shadow-md font-bold'
                  : 'text-[#c4c7c8] hover:text-white hover:bg-[#1c1613]'
              }`}
            >
              <Cookie className="w-4 h-4 shrink-0" />
              <span className="font-syne tracking-wide">Cookie Policy</span>
            </button>

            <button
              onClick={() => handleTabChange('contact')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'contact'
                  ? 'bg-[#f4bb92] text-[#1c1613] shadow-md font-bold'
                  : 'text-[#c4c7c8] hover:text-white hover:bg-[#1c1613]'
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span className="font-syne tracking-wide">Contact & Support</span>
            </button>
          </nav>

          <div className="pt-6 border-t border-[#2c241f] text-[11px] text-[#8e9192] font-mono space-y-1">
            <div>Effective: {lastUpdated}</div>
            <div>Version: 2.4.0 (Production)</div>
          </div>
        </aside>

        {/* Content Area */}
        <section className="md:col-span-3 bg-[#1c1613]/90 border border-[#2c241f] rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl">
          {activeTab === 'privacy' && (
            <div className="space-y-6 text-[#c4c7c8] font-manrope text-sm leading-relaxed animate-in fade-in duration-200">
              <div className="border-b border-[#2c241f] pb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-[#f4bb92] font-bold">
                  Compliance Document
                </span>
                <h1 className="font-syne text-2xl sm:text-4xl font-extrabold text-[#e2e2e2] tracking-tight mt-1">
                  Privacy Policy
                </h1>
                <p className="text-xs text-[#8e9192] font-mono mt-1">
                  Last Updated: {lastUpdated} · Published on {domainUrl}
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">1. Overview & Commitment</h2>
                <p>
                  Sakido (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the academic focus and workspace application hosted at{' '}
                  <a href={domainUrl} className="text-[#f4bb92] underline font-mono text-xs hover:text-white">{domainUrl}</a>. 
                  We are deeply committed to protecting your privacy, securing your educational data, and complying strictly with global privacy standards, including GDPR, CCPA, and Google API Services User Data Policies.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">2. Information We Collect</h2>
                <ul className="list-disc pl-5 space-y-2 text-[#c4c7c8]">
                  <li>
                    <strong className="text-[#e2e2e2]">Account Information:</strong> When you sign up via Email or Google Auth, we store your primary email address and account metadata securely via Supabase Authentication.
                  </li>
                  <li>
                    <strong className="text-[#e2e2e2]">Workspace Data:</strong> Notes, tasks, class schedules, flashcards, and focus timer records created by you are stored in your encrypted cloud database or local browser storage.
                  </li>
                  <li>
                    <strong className="text-[#e2e2e2]">Technical Analytics:</strong> We collect non-identifying telemetry (such as page view counts and app performance) to maintain service stability.
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">3. Google User Data Policy</h2>
                <p>
                  If you sign in using Google Auth, Sakido requests access strictly to your basic profile (email address and account ID). 
                  We do not request or access private Google Drive files, contacts, or Gmail data. We never sell, rent, or share Google user data with third-party advertising networks.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">4. Data Storage & Security</h2>
                <p>
                  All database transmissions use SSL/TLS encryption. Data is hosted on enterprise cloud infrastructure with row-level security policies enforcing that only authenticated owners can read or modify their data.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">5. Your Rights & Data Deletion</h2>
                <p>
                  You retain complete ownership of your data. You may export or permanently delete your account and all associated workspace items at any time through the Account Settings tab inside Sakido or by emailing{' '}
                  <a href={`mailto:${contactEmail}`} className="text-[#f4bb92] underline font-mono text-xs hover:text-white">{contactEmail}</a>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-6 text-[#c4c7c8] font-manrope text-sm leading-relaxed animate-in fade-in duration-200">
              <div className="border-b border-[#2c241f] pb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-[#f4bb92] font-bold">
                  Agreement Terms
                </span>
                <h1 className="font-syne text-2xl sm:text-4xl font-extrabold text-[#e2e2e2] tracking-tight mt-1">
                  Terms of Service
                </h1>
                <p className="text-xs text-[#8e9192] font-mono mt-1">
                  Effective Date: {lastUpdated} · Published on {domainUrl}
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using Sakido ({domainUrl}), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must discontinue use of the platform immediately.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">2. Permitted Use & User Obligations</h2>
                <p>
                  Sakido is designed as a distraction-free academic focus and productivity environment. You agree to use the service only for lawful personal, educational, and professional purposes. You agree not to attempt unauthorized access to platform infrastructure or reverse engineer proprietary components.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">3. Intellectual Property</h2>
                <p>
                  The visual layout, source code, interactive canvas elements, and trademarks associated with Sakido are protected by copyright and intellectual property laws. All user-generated content (notes, flashcards, schedule data) remains the exclusive property of the user.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">4. Disclaimer of Warranties</h2>
                <p>
                  Sakido is provided &quot;as is&quot; without warranties of any kind, whether express or implied. While we maintain high uptime standards, we do not guarantee uninterrupted operational availability.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">5. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by applicable law, Sakido Technologies Inc. shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the platform.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-6 text-[#c4c7c8] font-manrope text-sm leading-relaxed animate-in fade-in duration-200">
              <div className="border-b border-[#2c241f] pb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-[#f4bb92] font-bold">
                  Storage & Tracking
                </span>
                <h1 className="font-syne text-2xl sm:text-4xl font-extrabold text-[#e2e2e2] tracking-tight mt-1">
                  Cookie & Local Storage Policy
                </h1>
                <p className="text-xs text-[#8e9192] font-mono mt-1">
                  Last Updated: {lastUpdated} · Published on {domainUrl}
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">1. How We Use Storage</h2>
                <p>
                  Sakido uses essential cookies and browser LocalStorage solely to maintain your active login session and preserve your user preferences (such as dark mode, focus timer presets, and local task drafts).
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">2. Essential Cookies</h2>
                <div className="p-4 rounded-xl bg-[#15110e] border border-[#2c241f] space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-[#e2e2e2]">
                    <span>sb-access-token</span>
                    <span className="text-[#f4bb92]">Essential (Authentication Session)</span>
                  </div>
                  <div className="flex justify-between text-[#e2e2e2]">
                    <span>sakido_banner_url</span>
                    <span className="text-[#f4bb92]">Preference (Custom UI Storage)</span>
                  </div>
                  <div className="flex justify-between text-[#e2e2e2]">
                    <span>sakido_tasks / sakido_notes</span>
                    <span className="text-[#f4bb92]">Functional (Offline Workspace Drafts)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-[#e2e2e2]">3. Zero Third-Party Advertising Cookies</h2>
                <p>
                  We do not use cross-site tracking cookies, behavioral ad scripts, or sell audience profiles to third parties.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-6 text-[#c4c7c8] font-manrope text-sm leading-relaxed animate-in fade-in duration-200">
              <div className="border-b border-[#2c241f] pb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-[#f4bb92] font-bold">
                  Google Console & Verification Support
                </span>
                <h1 className="font-syne text-2xl sm:text-4xl font-extrabold text-[#e2e2e2] tracking-tight mt-1">
                  Contact & Legal Notice
                </h1>
                <p className="text-xs text-[#8e9192] font-mono mt-1">
                  Official Verification Channel for {domainUrl}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#15110e] border border-[#2c241f] space-y-2">
                  <span className="text-xs font-mono text-[#8e9192] uppercase font-bold">Support Email</span>
                  <div className="text-[#e2e2e2] font-mono text-sm font-semibold">{contactEmail}</div>
                  <p className="text-xs text-[#c4c7c8]">Inquiries regarding privacy, account deletion, or technical support.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#15110e] border border-[#2c241f] space-y-2">
                  <span className="text-xs font-mono text-[#8e9192] uppercase font-bold">Official App Domain</span>
                  <div className="text-[#f4bb92] font-mono text-sm font-semibold flex items-center gap-1">
                    {domainUrl}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-[#c4c7c8]">Verified deployment URL for Google Search Console & OAuth.</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#f4bb92]/10 border border-[#f4bb92]/30 flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#f4bb92] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-syne text-sm font-bold text-[#e2e2e2]">Google OAuth & Search Console Compliance Verified</h3>
                  <p className="text-xs text-[#c4c7c8]">
                    This domain and its associated privacy policy comply with Google API User Data Policies and Google Search Console verification guidelines.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
