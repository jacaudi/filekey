// Ported from src/js/worker/index.js: the msg_type switch becomes a handler map
// (design §10.4) over the same module state; the closure-scoped derivation helpers
// become module functions with IDENTICAL crypto parameters:
//   seed salt = strict_hex_keccak256(hex(prf[0..32]) + seed_name)   ("0x…" string)
//   info      = utf8("filekey pk seed: " + salt)
//   seed      = HKDF-SHA-256 deriveBits(salt=bytes(salt), info, 512)
//   per-file  = HKDF-SHA-256 deriveKey(salt=random16|given, info=[]) → AES-GCM-256
// Deliberate changes (design §3): failures throw → typed {ok:false} replies with
// the correlation id echoed (the old worker posted an unattributable bare null);
// set_seed awaits ECDH setup before replying (old code raced it in the background).
import { bufferToHex, hexToArrayBuffer } from '../buffer';
import { strict_hex_keccak256 } from '../keccak';
import { deriveEcdhKey, encrypt, importEcdhPub, noDecodeDecrypt } from '../encryption';
import { convertKeys, generateKeyPair } from '../ecdh';

const SALT_BYTE_LEN = 16;
const MISC_SLICE = 32;

let active_prf_key: CryptoKey | null = null;
let active_prf_buff: ArrayBuffer | null = null;
let active_hkdf: CryptoKey | null = null;
let active_ecdh_priv_key: CryptoKey | null = null;
let active_det_ecdh_pub_buff: ArrayBuffer | null = null;
let shared_ecdh_pub_key: CryptoKey | null = null;

async function buffToHkdf(buff: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', buff, { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']);
}

async function generateNewSeed(seed_name: string): Promise<ArrayBuffer> {
  if (active_prf_key === null || active_prf_buff === null) {
    throw new Error('prf_to_key must run before set_seed');
  }
  const sliced_buff = active_prf_buff.slice(0, MISC_SLICE);
  const salt = strict_hex_keccak256(bufferToHex(sliced_buff) + seed_name);
  if (salt === null) {
    throw new Error('seed salt derivation failed');
  }
  const info = new TextEncoder().encode('filekey pk seed: ' + salt);
  return crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: hexToArrayBuffer(salt), info },
    active_prf_key,
    512,
  );
}

async function genDetEcdh(seed: ArrayBuffer): Promise<void> {
  const pair = generateKeyPair(seed);
  const converted = await convertKeys(pair.privateKey, pair.publicKey);
  active_ecdh_priv_key = converted.privateKey;
  active_det_ecdh_pub_buff = converted.publicKeyRaw;
}

async function generateAesFromHkdf(
  hkdf: CryptoKey,
  known_salt: ArrayBuffer | null,
): Promise<{ aes_key: CryptoKey; salt: ArrayBuffer }> {
  const salt = known_salt ?? crypto.getRandomValues(new Uint8Array(SALT_BYTE_LEN)).buffer;
  const aes_key = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array([]) },
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return { aes_key, salt };
}

export const handlers: Record<string, (payload: any) => Promise<unknown>> = {
  prf_to_key: async ({ prf_buff }) => {
    active_prf_key = await buffToHkdf(prf_buff);
    active_prf_buff = prf_buff;
    return null;
  },
  set_seed: async ({ seed_name }) => {
    const seed = await generateNewSeed(seed_name);
    active_hkdf = await buffToHkdf(seed);
    await genDetEcdh(seed);
    return null;
  },
  get_det_public_ecdh: async () => active_det_ecdh_pub_buff,
  new_enc: async ({ msg_buff }) => {
    if (active_hkdf === null) throw new Error('no active key: authenticate first');
    const { aes_key, salt } = await generateAesFromHkdf(active_hkdf, null);
    const encrypted_buff = await encrypt(aes_key, msg_buff, salt);
    return { encrypted_buff, salt };
  },
  new_dec: async ({ msg_buff }) => {
    if (active_hkdf === null) throw new Error('no active key: authenticate first');
    const key_salt = msg_buff.slice(0, SALT_BYTE_LEN);
    const { aes_key } = await generateAesFromHkdf(active_hkdf, key_salt);
    const decrypted_buff = await noDecodeDecrypt(aes_key, msg_buff.slice(SALT_BYTE_LEN), key_salt);
    return { decrypted_buff };
  },
  set_shared_pub: async ({ pub_buff }) => {
    shared_ecdh_pub_key = await importEcdhPub(pub_buff);
    return true;
  },
  shared_ecdh_enc: async ({ msg_buff }) => {
    if (active_ecdh_priv_key === null || shared_ecdh_pub_key === null) {
      throw new Error('missing ECDH keys: authenticate and set a recipient first');
    }
    const derived_key = await deriveEcdhKey(active_ecdh_priv_key, shared_ecdh_pub_key);
    const iv = crypto.getRandomValues(new Uint8Array(SALT_BYTE_LEN)).buffer;
    const encrypted_buff = await encrypt(derived_key, msg_buff, iv);
    return { encrypted_buff, salt: iv };
  },
  shared_ecdh_dec: async ({ msg_buff, pub_buff }) => {
    if (active_ecdh_priv_key === null) throw new Error('missing ECDH private key: authenticate first');
    const key_salt = msg_buff.slice(0, SALT_BYTE_LEN);
    const body = msg_buff.slice(SALT_BYTE_LEN);
    const shared_pub = await importEcdhPub(pub_buff);
    const derived_key = await deriveEcdhKey(active_ecdh_priv_key, shared_pub);
    const decrypted_buff = await noDecodeDecrypt(derived_key, body, key_salt);
    return { decrypted_buff };
  },
  clear_keys: async () => {
    active_prf_key = null;
    active_prf_buff = null;
    active_hkdf = null;
    active_ecdh_priv_key = null;
    shared_ecdh_pub_key = null;
    active_det_ecdh_pub_buff = null;
    return null;
  },
};

// ---- reply envelope ---------------------------------------------------------

type RpcRequest = { id: number; msg_type: string } & Record<string, unknown>;
type PostFn = (msg: unknown, transfer?: Transferable[]) => void;

const in_flight = new Set<number>(); // insertion-ordered: first entry = oldest

// Only these replies carry freshly-created buffers that are safe to transfer.
// get_det_public_ecdh returns the STORED pub buffer — transferring it would
// neuter worker state, so it is structured-cloned (matches the old worker).
const TRANSFER_RESULT: ReadonlySet<string> = new Set([
  'new_enc',
  'new_dec',
  'shared_ecdh_enc',
  'shared_ecdh_dec',
]);

function collectTransferables(result: unknown): Transferable[] {
  if (result instanceof ArrayBuffer) return [result];
  if (result === null || typeof result !== 'object') return [];
  return Object.values(result).filter((v): v is ArrayBuffer => v instanceof ArrayBuffer);
}

export function oldestInFlight(): number | null {
  for (const id of in_flight) return id;
  return null;
}

export async function handleRequest(req: RpcRequest, post: PostFn): Promise<void> {
  const { id, msg_type, ...payload } = req;
  const handler = handlers[msg_type];
  if (handler === undefined) {
    post({ id, ok: false, error: 'unknown msg_type: ' + msg_type });
    return;
  }
  in_flight.add(id);
  try {
    const result = await handler(payload);
    const transfer = TRANSFER_RESULT.has(msg_type) ? collectTransferables(result) : [];
    post({ id, ok: true, result }, transfer);
  } catch (e) {
    post({ id, ok: false, error: e instanceof Error ? e.message : String(e) });
  } finally {
    in_flight.delete(id);
  }
}

// ---- worker-scope registration ----------------------------------------------
// Guarded by WorkerGlobalScope (not typeof postMessage): vitest pools may run
// inside Node worker_threads, and jsdom defines window.postMessage — both must
// NOT register. Only a real Web Worker has WorkerGlobalScope.

const g = globalThis as Record<string, unknown>;
const isWorkerScope =
  typeof g.WorkerGlobalScope === 'function' &&
  globalThis instanceof (g.WorkerGlobalScope as abstract new () => unknown);

if (isWorkerScope) {
  const scope = globalThis as unknown as {
    addEventListener(type: string, cb: (e: any) => void): void;
    postMessage(msg: unknown, transfer?: Transferable[]): void;
  };
  const post: PostFn = (msg, transfer = []) => scope.postMessage(msg, transfer);
  scope.addEventListener('message', (e) => {
    void handleRequest(e.data as RpcRequest, post);
  });
  scope.addEventListener('unhandledrejection', (e) => {
    post({ id: oldestInFlight() ?? -1, ok: false, error: 'unhandled rejection: ' + String(e.reason) });
  });
  scope.addEventListener('error', (e) => {
    post({ id: oldestInFlight() ?? -1, ok: false, error: 'worker error: ' + String(e.message ?? 'unknown') });
  });
}
