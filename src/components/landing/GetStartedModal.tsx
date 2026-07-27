import React, { useState } from 'react';
import { X, Check, ArrowRight, Sparkles } from 'lucide-react';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GetStartedModal: React.FC<GetStartedModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
      <div className="bg-white border border-zinc-200 rounded-3xl p-8 max-w-md w-full relative shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-zinc-900 text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900">You are on the list</h3>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              We sent a confirmation link to <span className="font-semibold text-zinc-800">{email}</span>. Early access invites are issued weekly.
            </p>
            <button
              onClick={onClose}
              className="mt-6 bg-zinc-900 text-white text-xs font-semibold px-6 py-2.5 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
              <span>Private Beta Access</span>
            </div>

            <h3 className="text-2xl font-black tracking-tight text-zinc-900">
              Get Started with Sakido
            </h3>
            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
              Join students from Stanford, MIT, and Oxford testing the quiet workspace for notes, tasks, and calendars.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Student Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-zinc-900 transition-colors bg-white text-zinc-900"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                Request Early Invite
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[10px] text-zinc-400 text-center mt-4">
              Zero spam. Your email is never shared or tracked.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
