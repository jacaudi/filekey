#!/usr/bin/env node
// Generates the golden compatibility fixtures by executing the ORIGINAL
// (pre-conversion) worker source under Node's WebCrypto with a pinned synthetic
// PRF. Run once, commit the outputs; the vitest golden test decrypts them with
// the NEW ported modules. Requires Node >= 22 (globalThis.crypto).
//
//   node web/tests/fixtures/generate-fixtures.mjs
//
// Not byte-reproducible across runs (random salts/IVs) — the committed fixtures
// are the contract. share-key.hex and fixture.txt ARE deterministic.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const srcJs = path.join(repoRoot, 'src', 'js');

// Same list and ORDER as scripts/build.js WORKER_FILES — order matters for the
// top-level `let` initializers in worker/index.js.
const WORKER_FILES = [
  'worker/debug.js', 'worker/index.js', 'worker/encryption.js',
  'lib/buffer.js', 'worker/keccak.js', 'worker/ecdh.js',
];
const source = WORKER_FILES.map((f) => readFileSync(path.join(srcJs, f), 'utf8')).join('\n');

// Fake DedicatedWorkerGlobalScope. vm.runInThisContext runs the script in THIS
// realm: function declarations become globals, and WebCrypto ArrayBuffers pass
// the `instanceof ArrayBuffer` guard inside ecdh.js (a sandboxed vm context
// would fail that check cross-realm).
let messageHandler = null;
let replyResolve = null;
globalThis.self = {
  crypto: globalThis.crypto,
  addEventListener(type, handler) {
    if (type === 'message') messageHandler = handler;
  },
  postMessage(data) {
    const resolve = replyResolve;
    replyResolve = null;
    if (resolve) resolve(data);
  },
};

vm.runInThisContext(source, { filename: 'old-worker-concat.js' });

// Strictly serialized request/reply, matching how the old UI drove the worker.
function callWorker(msg) {
  return new Promise((resolve) => {
    replyResolve = resolve;
    messageHandler({ data: msg });
  });
}

// The old worker replies to set_seed BEFORE its background genDetEcdh finishes.
async function waitForSharePub() {
  for (let i = 0; i < 400; i++) {
    const pub = await callWorker({ msg_type: 'get_det_public_ecdh' });
    if (pub !== null) return pub;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('deterministic ECDH public key never became ready');
}

// MUST stay byte-identical to pinnedPrf() in web/tests/helpers.ts.
const PINNED_PRF = new Uint8Array(64);
for (let i = 0; i < 64; i++) PINNED_PRF[i] = i;

const PLAINTEXT = new TextEncoder().encode('FileKey golden fixture plaintext — do not change.\n');

const bh = new globalThis.buffer_helper();

function concatBuffers(...buffers) {
  const total = buffers.reduce((n, b) => n + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    out.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return out;
}

await callWorker({ msg_type: 'prf_to_key', prf_buff: PINNED_PRF.buffer.slice(0) });
await callWorker({ msg_type: 'set_seed', seed_name: '_0' });
const pub = await waitForSharePub();
const shareKeyHex = bh.bufferToHex(pub);
assert.strictEqual(pub.byteLength, 133);
assert.strictEqual(shareKeyHex.length, 266);
assert.ok(shareKeyHex.startsWith('04'));

// .filekey = salt(16) ‖ ciphertext
const enc = await callWorker({ msg_type: 'new_enc', msg_buff: PLAINTEXT.buffer.slice(0) });
assert.strictEqual(enc.salt.byteLength, 16);
const filekeyBytes = concatBuffers(enc.salt, enc.encrypted_buff);

// .shared_filekey = senderPub(133) ‖ iv(16) ‖ ciphertext — self-share
// (recipient = own key) so the same pinned identity can decrypt it.
assert.strictEqual(await callWorker({ msg_type: 'set_shared_pub', pub_buff: pub.slice(0) }), true);
const senc = await callWorker({ msg_type: 'shared_ecdh_enc', msg_buff: PLAINTEXT.buffer.slice(0) });
assert.strictEqual(senc.salt.byteLength, 16);
const sharedBody = concatBuffers(senc.salt, senc.encrypted_buff); // iv(16) ‖ ciphertext
const sharedBytes = concatBuffers(pub, sharedBody.buffer);

// Self-check with the OLD code before committing anything.
const dec = await callWorker({ msg_type: 'new_dec', msg_buff: filekeyBytes.buffer.slice(0) });
assert.deepStrictEqual(new Uint8Array(dec.decrypted_buff), PLAINTEXT, '.filekey self-check failed');
const sdec = await callWorker({
  msg_type: 'shared_ecdh_dec',
  msg_buff: sharedBody.buffer.slice(0),
  pub_buff: pub.slice(0),
});
assert.deepStrictEqual(new Uint8Array(sdec.decrypted_buff), PLAINTEXT, '.shared_filekey self-check failed');

writeFileSync(path.join(here, 'fixture.txt'), PLAINTEXT);
writeFileSync(path.join(here, 'fixture.txt.filekey'), filekeyBytes);
writeFileSync(path.join(here, 'fixture.txt.shared_filekey'), sharedBytes);
writeFileSync(path.join(here, 'share-key.hex'), shareKeyHex + '\n');
console.log('fixtures written:');
console.log('  share-key.hex           ', shareKeyHex.slice(0, 16) + '…');
console.log('  fixture.txt             ', PLAINTEXT.byteLength, 'bytes');
console.log('  fixture.txt.filekey     ', filekeyBytes.byteLength, 'bytes');
console.log('  fixture.txt.shared_filekey', sharedBytes.byteLength, 'bytes');
