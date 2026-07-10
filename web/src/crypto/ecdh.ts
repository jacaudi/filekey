// Ported from src/js/worker/ecdh.js. The BigInt curve math (Montgomery ladder,
// on-curve assertions) and PKCS#8 DER builder are copied VERBATIM — any change
// alters every existing user's deterministic Share Key. Only the packaging
// changed: constructor-function → module exports, callbacks → async/await, the
// triplicated 66-byte big-endian serialization → one bigIntTo66Bytes helper
// (same bytes), failures throw instead of returning {success: false}.

const P521 = {
  P: BigInt(
    '0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
  ),
  A: BigInt(
    '0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC'
  ),
  B: BigInt(
    '0x051953EB9618E1C9A1F929A21A0B68540EEA2DA725B99B315F3B8B489918EF109E156193951EC7E937B1652C0BD3BB1BF073573DF883D2C34F1EF451FD46B503F00'
  ),
  GX: BigInt(
    '0xC6858E06B70404E9CD9E3ECB662395B4429C648139053FB521F828AF606B4D3DBAA14B5E77EFE75928FE1DC127A2FFA8DE3348B3C1856A429BF97E7E31C2E5BD66'
  ),
  GY: BigInt(
    '0x11839296A789A3BC0045C8A5FB42C7D1BD998F54449579B446817AFBD17273E662C97EE72995EF42640C550B9013FAD0761353C7086A272C24088BE94769FD16650'
  ),
  N: BigInt(
    '0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA51868783BF2F966B7FCC0148F709A5D03BB5C9B8899C47AEBB6FB71E91386409'
  ),
} as const;

export interface EcPoint {
  x: bigint;
  y: bigint;
}
export interface EcdhKeyPair {
  privateKey: bigint;
  publicKey: EcPoint;
}

type MaybePoint = EcPoint | null;

// — copy verbatim from src/js/worker/ecdh.js:11-89
function modAdd(a: bigint, b: bigint, m: bigint): bigint {
  return ((a % m) + (b % m)) % m;
}

function modSub(a: bigint, b: bigint, m: bigint): bigint {
  return ((a % m) - (b % m) + m) % m;
}

function modMul(a: bigint, b: bigint, m: bigint): bigint {
  return ((a % m) * (b % m)) % m;
}

function modInv(a: bigint, m: bigint): bigint {
  function egcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
    if (a === 0n) return [b, 0n, 1n];
    const [g, x, y] = egcd(b % a, a);
    return [g, y - (b / a) * x, x];
  }
  const [g, x, _] = egcd(a, m);
  if (g !== 1n) throw new Error('Modular inverse does not exist');
  return ((x % m) + m) % m;
}

function isOnCurve(point: MaybePoint): boolean {
  if (point === null) return true;
  const { x, y } = point;
  const left = modMul(y, y, P521.P);
  const x3 = modMul(modMul(x, x, P521.P), x, P521.P);
  const ax = modMul(P521.A, x, P521.P);
  const right = modAdd(modAdd(x3, ax, P521.P), P521.B, P521.P);
  return left === right;
}

function pointAdd(P1: MaybePoint, P2: MaybePoint): MaybePoint {
  if (P1 === null) return P2;
  if (P2 === null) return P1;
  if (P1.x === P2.x) {
    if (P1.y === P2.y) {
      return pointDouble(P1);
    }
    return null;
  }
  const slope = modMul(
    modSub(P2.y, P1.y, P521.P),
    modInv(modSub(P2.x, P1.x, P521.P), P521.P),
    P521.P
  );
  const x3 = modSub(modSub(modMul(slope, slope, P521.P), P1.x, P521.P), P2.x, P521.P);
  const y3 = modSub(modMul(slope, modSub(P1.x, x3, P521.P), P521.P), P1.y, P521.P);
  const result = { x: x3, y: y3 };
  if (!isOnCurve(result)) throw new Error('Point addition resulted in invalid point');
  return result;
}

function pointDouble(P: MaybePoint): MaybePoint {
  if (P === null) return null;
  if (P.y === 0n) return null;
  const slope = modMul(
    modAdd(modMul(3n, modMul(P.x, P.x, P521.P), P521.P), P521.A, P521.P),
    modInv(modMul(2n, P.y, P521.P), P521.P),
    P521.P
  );
  const x3 = modSub(modMul(slope, slope, P521.P), modMul(2n, P.x, P521.P), P521.P);
  const y3 = modSub(modMul(slope, modSub(P.x, x3, P521.P), P521.P), P.y, P521.P);
  const result = { x: x3, y: y3 };
  if (!isOnCurve(result)) throw new Error('Point doubling resulted in invalid point');
  return result;
}

function scalarMul(k: bigint, P: MaybePoint): MaybePoint {
  if (k === 0n) return null;
  if (P === null) return null;
  let r0: MaybePoint = null;
  let r1: MaybePoint = P;
  const bits = k.toString(2).padStart(521, '0');
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '0') {
      r1 = pointAdd(r0, r1);
      r0 = pointDouble(r0);
    } else {
      r0 = pointAdd(r0, r1);
      r1 = pointDouble(r1);
    }
  }
  return r0;
}

// — copy verbatim from src/js/worker/ecdh.js:91-108
export function generateKeyPair(seed: ArrayBuffer): EcdhKeyPair {
  if (!(seed instanceof ArrayBuffer) || seed.byteLength !== 64) {
    throw new Error('Seed must be a 64-byte ArrayBuffer');
  }
  const seedView = new Uint8Array(seed);
  let privateKey = 0n;
  for (let i = 0; i < seedView.length; i++) {
    privateKey = (privateKey << 8n) | BigInt(seedView[i]);
  }
  const mask = (1n << 521n) - 1n;
  privateKey = privateKey & mask;
  privateKey = (privateKey % (P521.N - 1n)) + 1n;
  const publicKey = scalarMul(privateKey, { x: P521.GX, y: P521.GY });
  if (!isOnCurve(publicKey)) {
    throw new Error('Generated public key is not on curve');
  }
  return { privateKey, publicKey: publicKey as EcPoint };
}

function bigIntTo66Bytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(66);
  let temp = value;
  for (let i = bytes.length - 1; i >= 0; i--) {
    bytes[i] = Number(temp & 0xffn);
    temp = temp >> 8n;
  }
  return bytes;
}

function buildRawPublicKey(publicKey: EcPoint): Uint8Array {
  const raw = new Uint8Array(133);
  raw[0] = 0x04;
  raw.set(bigIntTo66Bytes(publicKey.x), 1);
  raw.set(bigIntTo66Bytes(publicKey.y), 67);
  return raw;
}

// — copy verbatim from src/js/worker/ecdh.js:111-134
function buildPKCS8WithPublicKey(privKeyBytes: Uint8Array, pubKeyBytes: Uint8Array): Uint8Array {
  if (privKeyBytes.length !== 66) throw new Error('privKeyBytes must be 66 bytes, got ' + privKeyBytes.length);
  if (pubKeyBytes.length !== 133) throw new Error('pubKeyBytes must be 133 bytes, got ' + pubKeyBytes.length);
  function calcLen(len: number): Uint8Array {
    if (len < 128) return new Uint8Array([len]);
    if (len < 256) return new Uint8Array([0x81, len]);
    return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
  }
  const ecPublicKeyOid = new Uint8Array([0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01]);
  const secp521r1Oid = new Uint8Array([0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x23]);
  const algoContent = new Uint8Array([...ecPublicKeyOid, ...secp521r1Oid]);
  const algoId = new Uint8Array([0x30, ...calcLen(algoContent.length), ...algoContent]);
  const privOctet = new Uint8Array([0x04, 0x42, ...privKeyBytes]);
  const params0 = new Uint8Array([0xa0, 0x07, ...secp521r1Oid]);
  const bitStringContent = new Uint8Array([0x00, ...pubKeyBytes]);
  const bitString = new Uint8Array([0x03, ...calcLen(bitStringContent.length), ...bitStringContent]);
  const params1 = new Uint8Array([0xa1, ...calcLen(bitString.length), ...bitString]);
  const ecPrivContent = new Uint8Array([0x02, 0x01, 0x01, ...privOctet, ...params0, ...params1]);
  const ecPriv = new Uint8Array([0x30, ...calcLen(ecPrivContent.length), ...ecPrivContent]);
  const outerOctet = new Uint8Array([0x04, ...calcLen(ecPriv.length), ...ecPriv]);
  const outerVersion = new Uint8Array([0x02, 0x01, 0x00]);
  const outerContent = new Uint8Array([...outerVersion, ...algoId, ...outerOctet]);
  return new Uint8Array([0x30, ...calcLen(outerContent.length), ...outerContent]);
}

export async function convertKeys(
  privateKey: bigint,
  publicKey: EcPoint,
): Promise<{ privateKey: CryptoKey; publicKeyRaw: ArrayBuffer }> {
  const pkcs8 = buildPKCS8WithPublicKey(bigIntTo66Bytes(privateKey), buildRawPublicKey(publicKey));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-521' },
    false,
    ['deriveKey', 'deriveBits'],
  );
  const raw = buildRawPublicKey(publicKey);
  // Same point-validation the old convertPublicKeyToRaw performed via import:
  await crypto.subtle.importKey('raw', raw.buffer as ArrayBuffer, { name: 'ECDH', namedCurve: 'P-521' }, false, []);
  return { privateKey: key, publicKeyRaw: raw.buffer as ArrayBuffer };
}
