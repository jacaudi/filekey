// Serializes every set_shared_pub → (shared_ecdh_enc | dry-run) critical section
// against the worker's single module-global shared_ecdh_pub_key slot. The worker
// (frozen, design §14) does not serialize message handling and set_shared_pub has
// an internal await before it writes the slot, so two concurrent flows (a recipient
// validation dry-run and a per-file encrypt, or two encrypts) could otherwise
// interleave set→set→enc and encrypt to the WRONG recipient. validate.ts and
// shareFile.ts both run their slot-touching sequence through this lock, making
// set-then-use atomic from the worker's perspective.
let chain: Promise<unknown> = Promise.resolve();
export function withSharedPubLock<T>(critical: () => Promise<T>): Promise<T> {
  const run = chain.then(critical, critical);
  chain = run.then(() => undefined, () => undefined);
  return run;
}
