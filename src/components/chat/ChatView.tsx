import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Lock,
  Search,
  User,
  Check,
  CheckCheck,
  AlertTriangle,
  Clock,
  Shield,
  ArrowLeft,
  RefreshCw,
  Info,
  Key,
  MessageSquare,
  UserPlus
} from 'lucide-react';
import { useChat, DecryptedMessage, Conversation } from '../../hooks/useChat';

interface ChatViewProps {
  currentUserId?: string;
  currentUserEmail?: string;
}

export const ChatView: React.FC<ChatViewProps> = ({ currentUserId, currentUserEmail }) => {
  const {
    conversations,
    activeConversation,
    activePeer,
    setActiveConversation,

    messages,
    hasMore,
    isLoadingMessages,
    loadOlder,

    sendMessage,
    sendError,
    isSending,
    rateLimitCooldown,

    peerTyping,
    sendTypingIndicator,
    peerOnline,

    keyStatus,
    myFingerprint,
    peerKeyChanged,

    searchEmail,
    setSearchEmail,
    searchResult,
    searchError,
    isSearching,
    handleSearchUser,
    startConversationWithUser,
  } = useChat(currentUserId);

  const [inputMessage, setInputMessage] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSecurityTooltip, setShowSecurityTooltip] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new incoming message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, peerTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending || rateLimitCooldown > 0) return;
    const text = inputMessage;
    setInputMessage('');
    await sendMessage(text);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    sendTypingIndicator();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-6rem)] flex rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#1a1411] overflow-hidden shadow-sm relative font-sans text-on-surface">
      {/* ─── LEFT PANEL: CONVERSATIONS LIST ──────────────────────────────── */}
      <div
        className={`w-full md:w-80 border-r border-outline-variant/30 flex flex-col bg-surface-container-low/50 dark:bg-[#1f1915] ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-base text-on-surface">Messages</h2>
          </div>
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Start new encrypted chat"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* E2E Identity Banner */}
        <div className="px-4 py-2.5 bg-surface-container/60 border-b border-outline-variant/20 flex items-center justify-between text-[11px] font-mono text-secondary">
          <span className="flex items-center gap-1.5 truncate">
            <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>Key: {myFingerprint || 'INITIALIZING'}</span>
          </span>
          <span className="text-emerald-500 font-bold uppercase text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 shrink-0">
            E2E READY
          </span>
        </div>

        {/* Conversations Scroll Container */}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/20 no-scrollbar">
          {conversations.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3 text-secondary">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-secondary/60">
                <Lock className="w-6 h-6" />
              </div>
              <p className="text-xs leading-relaxed max-w-[200px]">
                No encrypted conversations yet. Start a chat with a classmate!
              </p>
              <button
                onClick={() => setShowSearchModal(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Find User
              </button>
            </div>
          ) : (
            conversations.map((convo) => {
              const isActive = activeConversation === convo.peerId;
              return (
                <button
                  key={convo.peerId}
                  onClick={() => setActiveConversation(convo.peerId)}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 border-l-4 border-primary'
                      : 'hover:bg-surface-container/40'
                  }`}
                >
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center font-bold text-sm text-primary uppercase">
                      {convo.peerName.slice(0, 2)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-xs text-on-surface truncate">
                        {convo.peerName}
                      </span>
                      {convo.lastMessage && (
                        <span className="text-[10px] text-secondary font-mono shrink-0">
                          {new Date(convo.lastMessage.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-secondary truncate font-mono">
                      {convo.lastMessage ? convo.lastMessage.plaintext : '🔒 Encrypted Channel'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL: CHAT THREAD ────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col bg-surface-container-lowest dark:bg-[#1a1411] ${
          !activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversation && activePeer ? (
          <>
            {/* Active Chat Header */}
            <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between gap-3 bg-surface-container-low/40">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs uppercase">
                    {activePeer.peerName.slice(0, 2)}
                  </div>
                  {peerOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-on-surface truncate leading-tight">
                      {activePeer.peerName}
                    </h3>
                    {peerOnline && (
                      <span className="text-[10px] text-emerald-500 font-mono font-semibold uppercase">
                        ONLINE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-secondary font-mono">
                    <span>Key: {activePeer.peerFingerprint}</span>
                  </div>
                </div>
              </div>

              {/* Encryption Tooltip & Security Badge */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowSecurityTooltip(!showSecurityTooltip)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 transition-colors text-xs font-semibold cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">E2E Encrypted</span>
                  <Info className="w-3 h-3 text-emerald-500/70" />
                </button>

                {showSecurityTooltip && (
                  <div className="absolute right-0 top-9 z-30 w-72 p-3 bg-surface-container-high dark:bg-[#261f1a] border border-outline-variant/60 rounded-xl shadow-xl text-xs text-secondary leading-relaxed">
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold mb-1">
                      <Shield className="w-4 h-4" /> End-to-End Encryption
                    </div>
                    <p className="text-[11px] mb-2">
                      Messages are encrypted locally on your device. Only you and {activePeer.peerName} possess the private keys to decrypt them.
                    </p>
                    <p className="text-[10px] text-secondary/80 italic font-mono border-t border-outline-variant/30 pt-1.5">
                      Notice: Message content is encrypted, but Sakido servers record timestamp and recipient IDs for rate-limiting.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Warning Banner: New Device Key State */}
            {keyStatus === 'new_device' && (
              <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>New Device Detected:</strong> Your private key was generated on this browser. Messages sent prior to this session cannot be decrypted here.
                </span>
              </div>
            )}

            {/* Warning Banner: Peer Key Changed */}
            {peerKeyChanged && (
              <div className="px-4 py-2 bg-red-500/15 border-b border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>Security Alert:</strong> {activePeer.peerName}&apos;s public key has changed. They may have logged in on a new device.
                </span>
              </div>
            )}

            {/* Rate Limit Error Banner */}
            {sendError && (
              <div className="px-4 py-2 bg-error-container/40 border-b border-error/40 text-error-container text-xs flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono">
                  <Clock className="w-4 h-4 shrink-0" />
                  {sendError}
                </span>
                {rateLimitCooldown > 0 && (
                  <span className="font-bold text-xs px-2 py-0.5 rounded bg-error text-on-error font-mono">
                    {rateLimitCooldown}s
                  </span>
                )}
              </div>
            )}

            {/* Message Thread Area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar"
            >
              {/* Pagination Load Older Button */}
              {hasMore && (
                <div className="text-center py-2">
                  <button
                    onClick={loadOlder}
                    disabled={isLoadingMessages}
                    className="px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-secondary hover:text-on-surface text-xs font-mono transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isLoadingMessages ? 'Decrypting older...' : 'Load older messages'}
                  </button>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-secondary opacity-70">
                  <Lock className="w-8 h-8 text-primary/60 mb-1" />
                  <p className="text-xs font-mono text-center">
                    This end-to-end encrypted channel is ready.<br />Send a message to start chatting!
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                        m.isSelf
                          ? 'bg-primary text-on-primary rounded-br-none'
                          : m.status === 'undecryptable'
                          ? 'bg-error-container/30 border border-error/30 text-error-container rounded-bl-none font-mono'
                          : 'bg-surface-container-low border border-outline-variant/40 text-on-surface rounded-bl-none'
                      }`}
                    >
                      {m.plaintext}
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-[10px] text-secondary font-mono px-1">
                      <span>
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {m.isSelf && (
                        <span>
                          {m.status === 'read' ? (
                            <CheckCheck className="w-3 h-3 text-emerald-500 inline" />
                          ) : (
                            <Check className="w-3 h-3 text-secondary/60 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Ephemeral Typing Indicator */}
              {peerTyping && (
                <div className="flex items-center gap-2 text-xs text-secondary font-mono pl-1 pt-1 animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>{activePeer.peerName} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer Area */}
            <form onSubmit={handleSend} className="p-3 border-t border-outline-variant/30 bg-surface-container-low/30">
              <div className="flex items-end gap-2 bg-surface-container-lowest dark:bg-[#201914] border border-outline-variant/40 rounded-2xl p-2 focus-within:border-primary transition-colors">
                <textarea
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Write encrypted message to ${activePeer.peerName}...`}
                  rows={1}
                  disabled={rateLimitCooldown > 0}
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-on-surface placeholder:text-secondary/60 resize-none max-h-24 py-1 px-2 no-scrollbar"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending || rateLimitCooldown > 0}
                  className="p-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  title="Send encrypted message"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center px-2 pt-1.5 text-[10px] text-secondary font-mono">
                <span>🔒 End-to-end encrypted</span>
                <span>{inputMessage.length}/5000</span>
              </div>
            </form>
          </>
        ) : (
          /* Empty Active Chat Placeholder */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4 text-secondary">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-on-surface mb-1">
                Sakido Encrypted Direct Messages
              </h3>
              <p className="text-xs leading-relaxed max-w-sm">
                Select a conversation from the left panel or click &quot;New Chat&quot; to start a 1:1 end-to-end encrypted chat with a classmate.
              </p>
            </div>
            <button
              onClick={() => setShowSearchModal(true)}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Start New Conversation</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── NEW CHAT MODAL ──────────────────────────────────────────────── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest dark:bg-[#201914] border border-outline-variant/60 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h3 className="font-display font-bold text-base text-on-surface flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> Start New Encrypted Chat
              </h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-secondary hover:text-on-surface text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSearchUser} className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-secondary mb-1">
                  Classmate User ID or Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="e.g., student-uuid-or-email"
                    required
                    className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchEmail.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
                  </button>
                </div>
              </div>

              {searchError && (
                <p className="text-xs text-error font-mono bg-error-container/20 p-2 rounded-lg border border-error/30">
                  {searchError}
                </p>
              )}

              {searchResult && (
                <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-on-surface truncate">{searchResult.name}</p>
                    <p className="text-[10px] text-secondary font-mono truncate">{searchResult.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      startConversationWithUser(searchResult);
                      setShowSearchModal(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
                  >
                    Start Chat
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
