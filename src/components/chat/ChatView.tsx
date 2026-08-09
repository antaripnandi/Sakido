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
  Edit2,
  Copy,
  Plus,
  X,
  MessageSquare
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
    myUsername,
    myDiscriminator,
    myHandle,
    updateUsername,
    peerKeyChanged,

    searchQuery,
    setSearchQuery,
    searchResult,
    searchError,
    isSearching,
    handleSearchUser,
    startConversationWithUser,
  } = useChat(currentUserId, currentUserEmail);

  const [inputMessage, setInputMessage] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editNameInput, setEditNameInput] = useState(myUsername);
  const [copiedTag, setCopiedTag] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [showKeyDetails, setShowKeyDetails] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync edit input when myUsername updates
  useEffect(() => {
    setEditNameInput(myUsername);
  }, [myUsername]);

  // Auto-scroll to bottom on new messages
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

  const handleSaveUsername = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editNameInput.trim()) {
      await updateUsername(editNameInput);
    }
    setIsEditingUsername(false);
  };

  const handleCopyHandle = () => {
    navigator.clipboard.writeText(myHandle);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2000);
  };

  return (
    <div className="w-full h-[calc(100vh-6.5rem)] flex rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#181310] overflow-hidden shadow-xs font-sans text-on-surface">
      {/* ─── SIDEBAR: CONVERSATIONS & MY IDENTITY ────────────────────────── */}
      <div
        className={`w-full md:w-80 border-r border-outline-variant/20 flex flex-col bg-surface-container-low/30 dark:bg-[#1d1714] ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* User Identity & Tag Header */}
        <div className="p-3.5 border-b border-outline-variant/20 bg-surface-container-low/60 dark:bg-[#1a1411]">
          <div className="flex items-center justify-between gap-2">
            {isEditingUsername ? (
              <form onSubmit={handleSaveUsername} className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  placeholder="username"
                  autoFocus
                  className="w-full bg-surface-container border border-outline-variant/40 rounded px-2 py-1 text-xs text-on-surface font-mono outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="px-2 py-1 rounded bg-primary text-on-primary text-[10px] font-bold uppercase cursor-pointer shrink-0"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shrink-0 font-mono">
                  {myUsername.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-bold text-xs text-on-surface truncate font-sans">
                      {myUsername}
                    </span>
                    <span className="text-[10px] text-secondary font-mono shrink-0">
                      #{myDiscriminator}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingUsername(true)}
                  className="p-1 text-secondary hover:text-on-surface transition-colors cursor-pointer shrink-0"
                  title="Change username"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={handleCopyHandle}
                  className="p-1 text-secondary hover:text-on-surface transition-colors cursor-pointer shrink-0"
                  title="Copy full handle"
                >
                  {copiedTag ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}

            <button
              onClick={() => setShowSearchBox(!showSearchBox)}
              className="p-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-high text-on-surface hover:border-primary/50 transition-colors cursor-pointer shrink-0"
              title="Find user by handle or email"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick User Search Panel */}
        {showSearchBox && (
          <div className="p-3 border-b border-outline-variant/20 bg-surface-container/40 space-y-2">
            <form onSubmit={handleSearchUser} className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="username#1234 or email"
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-8 pr-2 py-1.5 text-xs text-on-surface font-mono outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isSearching ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Find'}
              </button>
            </form>

            {searchError && (
              <p className="text-[11px] text-error font-mono px-1">{searchError}</p>
            )}

            {searchResult && (
              <div className="p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-xs text-on-surface block truncate font-mono">
                    {searchResult.handle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startConversationWithUser(searchResult);
                    setShowSearchBox(false);
                  }}
                  className="px-2.5 py-1 rounded bg-primary text-on-primary font-bold text-[10px] uppercase cursor-pointer shrink-0"
                >
                  Chat
                </button>
              </div>
            )}
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/10 no-scrollbar">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-secondary text-xs space-y-2">
              <p className="font-mono text-[11px]">No direct messages yet.</p>
              <p className="text-[11px] text-secondary/70">
                Share your handle <strong className="text-on-surface font-mono">{myHandle}</strong> with a classmate to start!
              </p>
            </div>
          ) : (
            conversations.map((convo) => {
              const isActive = activeConversation === convo.peerId;
              return (
                <button
                  key={convo.peerId}
                  onClick={() => setActiveConversation(convo.peerId)}
                  className={`w-full p-3 text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-surface-container/30'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center font-bold text-xs text-primary uppercase shrink-0 font-mono mt-0.5">
                    {convo.peerName.slice(0, 2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-xs text-on-surface truncate">
                          {convo.peerName}
                        </span>
                        <span className="text-[10px] text-secondary font-mono shrink-0">
                          #{convo.peerDiscriminator}
                        </span>
                      </div>
                      {convo.lastMessage && (
                        <span className="text-[10px] text-secondary font-mono shrink-0">
                          {new Date(convo.lastMessage.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-secondary truncate font-mono">
                      {convo.lastMessage ? convo.lastMessage.plaintext : 'Encrypted channel'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── MAIN PANEL: CHAT THREAD ────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col bg-surface-container-lowest dark:bg-[#181310] ${
          !activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversation && activePeer ? (
          <>
            {/* Active Thread Header Bar */}
            <div className="px-4 py-2.5 border-b border-outline-variant/20 flex items-center justify-between gap-3 bg-surface-container-low/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1 rounded text-secondary hover:text-on-surface cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shrink-0 font-mono">
                  {activePeer.peerName.slice(0, 2)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs text-on-surface truncate leading-tight">
                      {activePeer.peerName}
                    </h3>
                    <span className="text-[10px] text-secondary font-mono">
                      #{activePeer.peerDiscriminator}
                    </span>
                    {peerOnline && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
                    )}
                  </div>
                  <div className="text-[10px] text-secondary font-mono flex items-center gap-2">
                    <span>Key: {activePeer.peerFingerprint}</span>
                  </div>
                </div>
              </div>

              {/* Minimal E2E Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowKeyDetails(!showKeyDetails)}
                  className="flex items-center gap-1 text-[11px] font-mono text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="View security details"
                >
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">E2E</span>
                </button>
              </div>
            </div>

            {/* Key Change & Security Warning Banners */}
            {peerKeyChanged && (
              <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-red-300 text-[11px] font-mono flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>Peer encryption key changed. They may have logged in on a new device.</span>
              </div>
            )}

            {/* Rate Limit Banner */}
            {sendError && (
              <div className="px-3 py-1.5 bg-error-container/30 border-b border-error/30 text-error-container text-[11px] font-mono flex items-center justify-between">
                <span>{sendError}</span>
                {rateLimitCooldown > 0 && (
                  <span className="font-bold px-1.5 py-0.5 rounded bg-error text-on-error">
                    {rateLimitCooldown}s
                  </span>
                )}
              </div>
            )}

            {/* Messages Thread Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
              {hasMore && (
                <div className="text-center py-1">
                  <button
                    onClick={loadOlder}
                    disabled={isLoadingMessages}
                    className="text-[11px] font-mono text-secondary hover:text-on-surface cursor-pointer"
                  >
                    {isLoadingMessages ? 'Loading...' : 'Load older messages'}
                  </button>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-1.5 text-secondary opacity-60">
                  <Lock className="w-6 h-6 text-primary/70 mb-1" />
                  <p className="text-xs font-mono">
                    End-to-end encrypted direct message with {activePeer.peerHandle}.
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2 rounded-xl text-xs leading-relaxed break-words ${
                        m.isSelf
                          ? 'bg-primary text-on-primary'
                          : m.status === 'undecryptable'
                          ? 'bg-error-container/30 border border-error/30 text-error-container font-mono'
                          : 'bg-surface-container-low border border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      {m.plaintext}
                    </div>

                    <div className="flex items-center gap-1 mt-0.5 text-[9px] text-secondary font-mono px-1">
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
                            <Check className="w-3 h-3 text-secondary/50 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Typing Indicator */}
              {peerTyping && (
                <div className="text-[10px] font-mono text-secondary pl-1 animate-pulse">
                  {activePeer.peerName} is typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSend} className="p-3 border-t border-outline-variant/20 bg-surface-container-low/20">
              <div className="flex items-center gap-2 bg-surface-container-lowest dark:bg-[#1f1915] border border-outline-variant/30 rounded-xl px-3 py-1.5 focus-within:border-primary transition-colors">
                <textarea
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    sendTypingIndicator();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder={`Message ${activePeer.peerName}...`}
                  rows={1}
                  disabled={rateLimitCooldown > 0}
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-on-surface placeholder:text-secondary/50 resize-none py-1 no-scrollbar"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending || rateLimitCooldown > 0}
                  className="p-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-opacity disabled:opacity-30 cursor-pointer shrink-0"
                >
                  {isSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Empty Active Chat State */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-3 text-secondary">
            <MessageSquare className="w-8 h-8 text-primary/40" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-on-surface">Sakido Direct Messages</h3>
              <p className="text-xs text-secondary/70 max-w-xs font-mono">
                Select a conversation or click <strong className="text-on-surface">+</strong> to find a classmate by handle (e.g., <span className="text-primary">user#1234</span>).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
