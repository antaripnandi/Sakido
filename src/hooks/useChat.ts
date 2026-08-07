import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import {
  initSodium,
  generateKeyPair,
  storePrivateKey,
  loadPrivateKey,
  derivePublicKey,
  upsertPublicKey,
  fetchPublicKey,
  encryptMessage,
  decryptMessage,
  getKeyFingerprint,
  sha256hex,
} from '../lib/cryptoUtils';

export interface DecryptedMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  plaintext: string;
  created_at: string;
  status: 'delivered' | 'read' | 'undecryptable';
  isSelf: boolean;
}

export interface Conversation {
  peerId: string;
  peerEmail: string;
  peerName: string;
  peerAvatarUrl?: string;
  peerPublicKey: string;
  peerFingerprint: string;
  lastMessage?: DecryptedMessage;
  unreadCount: number;
}

export interface UseChatReturn {
  conversations: Conversation[];
  activeConversation: string | null;
  activePeer: Conversation | null;
  setActiveConversation: (peerId: string | null) => void;

  messages: DecryptedMessage[];
  hasMore: boolean;
  isLoadingMessages: boolean;
  loadOlder: () => Promise<void>;

  sendMessage: (text: string) => Promise<void>;
  sendError: string | null;
  isSending: boolean;
  rateLimitCooldown: number;

  peerTyping: boolean;
  sendTypingIndicator: () => void;
  peerOnline: boolean;

  keyStatus: 'ready' | 'new_device' | 'loading' | 'error';
  myFingerprint: string;
  peerKeyChanged: boolean;

  searchEmail: string;
  setSearchEmail: (email: string) => void;
  searchResult: { id: string; email: string; name?: string } | null;
  searchError: string | null;
  isSearching: boolean;
  handleSearchUser: (e?: React.FormEvent) => Promise<void>;
  startConversationWithUser: (user: { id: string; email: string; name?: string }) => Promise<void>;
}

const MESSAGES_PER_PAGE = 20;

export function useChat(userId: string | undefined): UseChatReturn {
  const supabase = getSupabaseClient();

  // Key & Auth state
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);
  const [myPublicKey, setMyPublicKey] = useState<string>('');
  const [myFingerprint, setMyFingerprint] = useState<string>('');
  const [keyStatus, setKeyStatus] = useState<'ready' | 'new_device' | 'loading' | 'error'>('loading');

  // Conversations & Active Chat State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);

  // Send & Rate Limit State
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);

  // Ephemeral Realtime State
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerKeyChanged, setPeerKeyChanged] = useState(false);
  const activeChannelRef = useRef<any>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);

  // User Search State
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Cache of known peer public keys: peerId -> publicKey
  const peerKeyCache = useRef<Map<string, string>>(new Map());

  // Rate limit cooldown timer tick
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const interval = setInterval(() => {
      setRateLimitCooldown((prev) => {
        if (prev <= 1) {
          setSendError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitCooldown]);

  // ─── 1. KEY INITIALIZATION & HYGIENE ───────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    async function initKeys() {
      const uid = userId;
      if (!uid) return;

      try {
        await initSodium();
        let loadedKey = await loadPrivateKey(uid);
        const existingRemotePubKey = await fetchPublicKey(uid);

        if (!loadedKey) {
          // Key missing from IndexedDB
          const newPair = await generateKeyPair();
          await storePrivateKey(uid, newPair.privateKey);
          await upsertPublicKey(uid, newPair.publicKey);

          if (isMounted) {
            setPrivateKey(newPair.privateKey);
            setMyPublicKey(newPair.publicKey);
            setMyFingerprint(await getKeyFingerprint(newPair.publicKey));
            // If user already had a public key in profiles from a prior device
            if (existingRemotePubKey) {
              setKeyStatus('new_device');
            } else {
              setKeyStatus('ready');
            }
          }
        } else {
          // Key exists in IndexedDB
          const derivedPub = await derivePublicKey(loadedKey);
          if (existingRemotePubKey && existingRemotePubKey !== derivedPub) {
            // Re-sync remote public key if out of alignment
            await upsertPublicKey(uid, derivedPub);
          } else if (!existingRemotePubKey) {
            await upsertPublicKey(uid, derivedPub);
          }

          if (isMounted) {
            setPrivateKey(loadedKey);
            setMyPublicKey(derivedPub);
            setMyFingerprint(await getKeyFingerprint(derivedPub));
            setKeyStatus('ready');
          }
        }
      } catch (err) {
        console.error('Failed to initialize E2E crypto keys:', err);
        if (isMounted) setKeyStatus('error');
      }
    }

    initKeys();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Helper to resolve peer public key (cached or fetched)
  const getOrFetchPeerPubKey = useCallback(async (peerId: string): Promise<string | null> => {
    if (peerKeyCache.current.has(peerId)) {
      return peerKeyCache.current.get(peerId)!;
    }
    const pubKey = await fetchPublicKey(peerId);
    if (pubKey) {
      peerKeyCache.current.set(peerId, pubKey);
    }
    return pubKey;
  }, []);

  // ─── 2. LOAD CONVERSATIONS LIST ────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!userId || !supabase || !privateKey) return;

    try {
      // Fetch latest 50 messages involving userId to build conversation list
      const { data: rawMsgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !rawMsgs) return;

      const peerMap = new Map<string, any[]>();
      for (const m of rawMsgs) {
        const peerId = m.sender_id === userId ? m.recipient_id : m.sender_id;
        if (!peerMap.has(peerId)) {
          peerMap.set(peerId, []);
        }
        peerMap.get(peerId)!.push(m);
      }

      const peerIds = Array.from(peerMap.keys());
      if (peerIds.length === 0) {
        setConversations([]);
        return;
      }

      // Fetch profile info for peers
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, public_key')
        .in('id', peerIds);

      const profileKeyMap = new Map<string, string>();
      if (profilesData) {
        for (const p of profilesData) {
          if (p.public_key) {
            profileKeyMap.set(p.id, p.public_key);
            peerKeyCache.current.set(p.id, p.public_key);
          }
        }
      }

      const list: Conversation[] = [];

      for (const [pId, msgs] of peerMap.entries()) {
        const latestMsg = msgs[0];
        const peerPubKey = profileKeyMap.get(pId) || (await fetchPublicKey(pId)) || '';
        const fingerprint = peerPubKey ? await getKeyFingerprint(peerPubKey) : 'UNKNOWN';

        let decryptedLatest: DecryptedMessage | undefined;
        if (latestMsg && peerPubKey) {
          try {
            const isSelf = latestMsg.sender_id === userId;
            const senderPub = isSelf ? myPublicKey : peerPubKey;
            const text = await decryptMessage(latestMsg.ciphertext, latestMsg.nonce, senderPub, privateKey);
            decryptedLatest = {
              id: latestMsg.id,
              sender_id: latestMsg.sender_id,
              recipient_id: latestMsg.recipient_id,
              plaintext: text,
              created_at: latestMsg.created_at,
              status: 'delivered',
              isSelf,
            };
          } catch {
            decryptedLatest = {
              id: latestMsg.id,
              sender_id: latestMsg.sender_id,
              recipient_id: latestMsg.recipient_id,
              plaintext: '⚠️ Undecryptable message',
              created_at: latestMsg.created_at,
              status: 'undecryptable',
              isSelf: latestMsg.sender_id === userId,
            };
          }
        }

        list.push({
          peerId: pId,
          peerEmail: `User (${pId.substring(0, 8)})`,
          peerName: `Classmate ${pId.substring(0, 4).toUpperCase()}`,
          peerPublicKey: peerPubKey,
          peerFingerprint: fingerprint,
          lastMessage: decryptedLatest,
          unreadCount: 0,
        });
      }

      setConversations(list);
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    }
  }, [userId, supabase, privateKey, myPublicKey]);

  useEffect(() => {
    if (keyStatus === 'ready' || keyStatus === 'new_device') {
      loadConversations();
    }
  }, [keyStatus, loadConversations]);

  // ─── 3. FETCH MESSAGES FOR ACTIVE CONVERSATION ──────────────────────────
  const fetchMessagesForPeer = useCallback(
    async (peerId: string, offset: number, isInitial = false) => {
      if (!userId || !supabase || !privateKey) return;

      setIsLoadingMessages(true);
      try {
        const peerPubKey = await getOrFetchPeerPubKey(peerId);
        if (!peerPubKey) {
          setIsLoadingMessages(false);
          return;
        }

        const { data: rawMsgs, error } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`
          )
          .order('created_at', { ascending: false })
          .range(offset, offset + MESSAGES_PER_PAGE - 1);

        if (error || !rawMsgs) {
          setIsLoadingMessages(false);
          return;
        }

        setHasMore(rawMsgs.length === MESSAGES_PER_PAGE);

        const decryptedList: DecryptedMessage[] = [];
        for (const m of rawMsgs) {
          const isSelf = m.sender_id === userId;
          const senderPub = isSelf ? myPublicKey : peerPubKey;
          try {
            const text = await decryptMessage(m.ciphertext, m.nonce, senderPub, privateKey);
            decryptedList.push({
              id: m.id,
              sender_id: m.sender_id,
              recipient_id: m.recipient_id,
              plaintext: text,
              created_at: m.created_at,
              status: 'delivered',
              isSelf,
            });
          } catch {
            decryptedList.push({
              id: m.id,
              sender_id: m.sender_id,
              recipient_id: m.recipient_id,
              plaintext: '⚠️ Undecryptable message (different device key)',
              created_at: m.created_at,
              status: 'undecryptable',
              isSelf,
            });
          }
        }

        // Reverse to chronological order (oldest -> newest) for display
        const ordered = decryptedList.reverse();

        if (isInitial) {
          setMessages(ordered);
        } else {
          setMessages((prev) => [...ordered, ...prev]);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [userId, supabase, privateKey, myPublicKey, getOrFetchPeerPubKey]
  );

  // Switch active conversation
  useEffect(() => {
    if (activeConversation) {
      setMessageOffset(0);
      fetchMessagesForPeer(activeConversation, 0, true);
    } else {
      setMessages([]);
    }
  }, [activeConversation, fetchMessagesForPeer]);

  const loadOlder = async () => {
    if (!activeConversation || isLoadingMessages || !hasMore) return;
    const nextOffset = messageOffset + MESSAGES_PER_PAGE;
    setMessageOffset(nextOffset);
    await fetchMessagesForPeer(activeConversation, nextOffset, false);
  };

  // ─── 4. REALTIME INBOX SUBSCRIPTION (NEW MESSAGES) ──────────────────────
  useEffect(() => {
    if (!userId || !supabase || !privateKey) return;

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const newMsg = payload.new;
          // Client-side recipient verification (defense-in-depth)
          if (newMsg.recipient_id !== userId) return;

          const senderId = newMsg.sender_id;
          const peerPubKey = await getOrFetchPeerPubKey(senderId);
          if (!peerPubKey) return;

          try {
            const text = await decryptMessage(newMsg.ciphertext, newMsg.nonce, peerPubKey, privateKey);
            const decrypted: DecryptedMessage = {
              id: newMsg.id,
              sender_id: newMsg.sender_id,
              recipient_id: newMsg.recipient_id,
              plaintext: text,
              created_at: newMsg.created_at,
              status: 'delivered',
              isSelf: false,
            };

            // If incoming message is from active conversation, append to thread
            if (activeConversation === senderId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === decrypted.id)) return prev;
                return [...prev, decrypted];
              });
            }

            // Update conversation list
            loadConversations();
          } catch (err) {
            console.warn('Failed to decrypt incoming realtime message:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, privateKey, activeConversation, getOrFetchPeerPubKey, loadConversations]);

  // ─── 5. REALTIME PRESENCE, TYPING & READ RECEIPTS ──────────────────────
  useEffect(() => {
    if (!userId || !activeConversation || !supabase) {
      setPeerOnline(false);
      setPeerTyping(false);
      return;
    }

    let channel: any;

    async function setupDmChannel() {
      const pairKey = [userId, activeConversation].sort().join(':');
      const hash = await sha256hex(pairKey);
      const channelName = `dm:${hash.substring(0, 20)}`;

      channel = supabase!.channel(channelName);
      activeChannelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const isPeerPresent = Object.values(state).some((presences: any) =>
            presences.some((p: any) => p.user_id === activeConversation)
          );
          setPeerOnline(isPeerPresent);
        })
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          if (payload.payload?.sender_id === activeConversation) {
            setPeerTyping(true);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => setPeerTyping(false), 3000);
          }
        })
        .on('broadcast', { event: 'read' }, (payload: any) => {
          if (payload.payload?.sender_id === activeConversation) {
            setMessages((prev) =>
              prev.map((m) => (m.isSelf ? { ...m, status: 'read' } : m))
            );
          }
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            channel.track({ user_id: userId, online_at: new Date().toISOString() });
            // Broadcast read receipt to peer
            channel.send({
              type: 'broadcast',
              event: 'read',
              payload: { sender_id: userId },
            });
          }
        });
    }

    setupDmChannel();

    return () => {
      if (channel) {
        supabase!.removeChannel(channel);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      activeChannelRef.current = null;
      setPeerOnline(false);
      setPeerTyping(false);
    };
  }, [userId, activeConversation, supabase]);

  const sendTypingIndicator = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current < 1500) return; // Debounce 1.5s
    lastTypingBroadcastRef.current = now;

    if (activeChannelRef.current) {
      activeChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: userId },
      });
    }
  }, [userId]);

  // ─── 6. SEND MESSAGE & RATE LIMIT HANDLING ──────────────────────────────
  const sendMessage = async (text: string) => {
    if (!userId || !activeConversation || !supabase || !privateKey) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.length > 5000) {
      setSendError('Message exceeds 5,000 character limit.');
      return;
    }

    if (rateLimitCooldown > 0) {
      setSendError(`Please wait ${rateLimitCooldown} seconds before sending another message.`);
      return;
    }

    setSendError(null);
    setIsSending(true);

    try {
      const peerPubKey = await getOrFetchPeerPubKey(activeConversation);
      if (!peerPubKey) {
        setSendError('Recipient has not configured encryption keys.');
        setIsSending(false);
        return;
      }

      // Check if peer's public key changed since cached
      const freshPubKey = await fetchPublicKey(activeConversation);
      if (freshPubKey && freshPubKey !== peerPubKey) {
        setPeerKeyChanged(true);
        peerKeyCache.current.set(activeConversation, freshPubKey);
      }

      const encrypted = await encryptMessage(trimmed, peerPubKey, privateKey);

      const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          recipient_id: activeConversation,
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
        })
        .select()
        .single();

      if (error) {
        if (error.code === 'P0429' || error.message?.includes('RATE_LIMIT_BURST')) {
          setSendError("You're sending messages too fast. Please wait 5 seconds.");
          setRateLimitCooldown(5);
        } else if (error.code === 'P0430' || error.message?.includes('RATE_LIMIT_DAILY')) {
          setSendError('Daily message limit reached (500/day). Please try again tomorrow.');
        } else {
          setSendError(error.message || 'Failed to send message.');
        }
        setIsSending(false);
        return;
      }

      // Append locally
      const newDecryptedMsg: DecryptedMessage = {
        id: inserted ? inserted.id : `tmp-${Date.now()}`,
        sender_id: userId,
        recipient_id: activeConversation,
        plaintext: trimmed,
        created_at: inserted ? inserted.created_at : new Date().toISOString(),
        status: 'delivered',
        isSelf: true,
      };

      setMessages((prev) => [...prev, newDecryptedMsg]);
      loadConversations();
    } catch (err: any) {
      setSendError(err.message || 'Encryption failed.');
    } finally {
      setIsSending(false);
    }
  };

  // ─── 7. USER SEARCH BY EMAIL ───────────────────────────────────────────
  const handleSearchUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = searchEmail.trim().toLowerCase();
    if (!cleanEmail || !supabase) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, public_key')
        .eq('id', cleanEmail) // If profiles stores email or id lookup
        .maybeSingle();

      if (error || !data) {
        setSearchError('User not found or has not registered on Sakido yet.');
      } else if (data.id === userId) {
        setSearchError('You cannot message yourself.');
      } else {
        setSearchResult({
          id: data.id,
          email: cleanEmail,
          name: `Student (${cleanEmail.split('@')[0]})`,
        });
      }
    } catch {
      setSearchError('Failed to search for user.');
    } finally {
      setIsSearching(false);
    }
  };

  const startConversationWithUser = async (user: { id: string; email: string; name?: string }) => {
    const peerPubKey = await getOrFetchPeerPubKey(user.id);
    const fingerprint = peerPubKey ? await getKeyFingerprint(peerPubKey) : 'UNKNOWN';

    const existingIndex = conversations.findIndex((c) => c.peerId === user.id);
    if (existingIndex < 0) {
      const newConvo: Conversation = {
        peerId: user.id,
        peerEmail: user.email,
        peerName: user.name || user.email.split('@')[0],
        peerPublicKey: peerPubKey || '',
        peerFingerprint: fingerprint,
        unreadCount: 0,
      };
      setConversations((prev) => [newConvo, ...prev]);
    }

    setActiveConversation(user.id);
    setSearchEmail('');
    setSearchResult(null);
  };

  // Active Peer object
  const activePeer = conversations.find((c) => c.peerId === activeConversation) || null;

  return {
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
  };
}
