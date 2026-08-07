import sodium from 'libsodium-wrappers';
import { getSupabaseClient } from './supabaseClient';

let isSodiumReady = false;

/**
 * Initialize libsodium WASM wrapper cleanly before any crypto operation.
 */
export async function initSodium(): Promise<void> {
  if (isSodiumReady) return;
  await sodium.ready;
  isSodiumReady = true;
}

// ─── INDEXEDDB STORAGE FOR PRIVATE KEYS ──────────────────────────────────
const DB_NAME = 'sakido_crypto_db';
const DB_VERSION = 1;
const STORE_NAME = 'private_keys';

function openCryptoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storePrivateKey(userId: string, privateKey: Uint8Array): Promise<void> {
  const db = await openCryptoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ userId, privateKeyArray: Array.from(privateKey), updatedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadPrivateKey(userId: string): Promise<Uint8Array | null> {
  const db = await openCryptoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(userId);
    request.onsuccess = () => {
      const result = request.result;
      if (result && result.privateKeyArray) {
        resolve(new Uint8Array(result.privateKeyArray));
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── KEY GENERATION & FINGERPRINTING ─────────────────────────────────────

export interface KeyPairBase64 {
  publicKey: string;
  privateKey: Uint8Array;
}

export async function generateKeyPair(): Promise<KeyPairBase64> {
  await initSodium();
  const pair = sodium.crypto_box_keypair();
  return {
    publicKey: sodium.to_base64(pair.publicKey, sodium.base64_variants.ORIGINAL),
    privateKey: pair.privateKey,
  };
}

export async function derivePublicKey(privateKey: Uint8Array): Promise<string> {
  await initSodium();
  const pubKey = sodium.crypto_scalarmult_base(privateKey);
  return sodium.to_base64(pubKey, sodium.base64_variants.ORIGINAL);
}

export async function getKeyFingerprint(publicKeyBase64: string): Promise<string> {
  await initSodium();
  try {
    const pubKeyBytes = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
    const hash = sodium.crypto_generichash(16, pubKeyBytes, null as any);
    return sodium.to_hex(hash).substring(0, 16).toUpperCase();
  } catch {
    return 'UNKNOWN';
  }
}

export async function sha256hex(input: string): Promise<string> {
  await initSodium();
  const hash = sodium.crypto_generichash(16, sodium.from_string(input), null as any);
  return sodium.to_hex(hash);
}

// ─── SUPABASE PUBLIC KEY SYNC ─────────────────────────────────────────────

export async function upsertPublicKey(userId: string, publicKeyBase64: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        public_key: publicKeyBase64,
        public_key_updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw new Error(`Failed to publish public key: ${error.message}`);
  }
}

export async function fetchPublicKey(userId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // Call scoped RPC function to fetch ONLY public_key
  const { data, error } = await supabase.rpc('get_public_key', { target_user_id: userId });

  if (error) {
    console.warn(`Failed to fetch public key for ${userId}:`, error.message);
    return null;
  }

  return (data as string) || null;
}

// ─── ENCRYPTION & DECRYPTION ──────────────────────────────────────────────

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
}

export async function encryptMessage(
  plaintext: string,
  recipientPubKeyBase64: string,
  senderPrivateKey: Uint8Array
): Promise<EncryptedPayload> {
  await initSodium();

  if (!plaintext || plaintext.trim().length === 0) {
    throw new Error('Message text cannot be empty');
  }

  if (plaintext.length > 5000) {
    throw new Error('Message exceeds 5,000 character limit');
  }

  const recipientPubKey = sodium.from_base64(recipientPubKeyBase64, sodium.base64_variants.ORIGINAL);
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const ciphertext = sodium.crypto_box_easy(plaintext, nonce, recipientPubKey, senderPrivateKey);

  return {
    ciphertext: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
  };
}

export async function decryptMessage(
  ciphertextBase64: string,
  nonceBase64: string,
  senderPubKeyBase64: string,
  recipientPrivateKey: Uint8Array
): Promise<string> {
  await initSodium();

  try {
    const ciphertext = sodium.from_base64(ciphertextBase64, sodium.base64_variants.ORIGINAL);
    const nonce = sodium.from_base64(nonceBase64, sodium.base64_variants.ORIGINAL);
    const senderPubKey = sodium.from_base64(senderPubKeyBase64, sodium.base64_variants.ORIGINAL);

    const decrypted = sodium.crypto_box_open_easy(ciphertext, nonce, senderPubKey, recipientPrivateKey);
    return sodium.to_string(decrypted);
  } catch (err: any) {
    throw new Error('Failed to decrypt message (invalid key or corrupted payload)');
  }
}
