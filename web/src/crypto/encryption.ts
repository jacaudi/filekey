// Ported from src/js/worker/encryption.js. Callbacks → async/await; failures now
// throw (the worker RPC envelope turns them into typed {ok:false} replies — design
// §3). The aad parameter was dropped: no caller ever passed it. Crypto parameters
// are byte-identical to the original.

export async function encrypt(key: CryptoKey, plaintext: ArrayBuffer, iv: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
}

export async function noDecodeDecrypt(key: CryptoKey, ciphertext: ArrayBuffer, iv: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
}

export async function deriveEcdhKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function importEcdhPub(pub_buff: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', pub_buff, { name: 'ECDH', namedCurve: 'P-521' }, false, []);
}
