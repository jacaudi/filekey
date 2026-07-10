import { rpc } from '../crypto/client';
import { hexToArrayBuffer } from '../crypto/buffer';
import { RAW_KEY_RE } from './link';
import { withSharedPubLock } from './sharedPub';

/**
 * Validates a candidate Share Key: regex fast path, then a `set_shared_pub`
 * dry-run — the worker's `importEcdhPub` (SubtleCrypto `importKey`) rejects
 * off-curve points, which the regex cannot catch.
 *
 * WHY NO NEW msg_type (`validate_pub`): the Phase 1 worker protocol is frozen,
 * and a dedicated validation message would duplicate the exact same importKey
 * knowledge `set_shared_pub` already owns. The dry-run's only side effect is
 * that the worker's shared-pub slot now holds the candidate. That is safe
 * because of two things this phase establishes: (1) every `shared_ecdh_enc`
 * caller re-sets `set_shared_pub` for its chosen recipient immediately
 * beforehand within the same flow (see shareFile.ts), so worker shared-pub
 * state is never trusted across flows; and (2) ALL shared-pub slot access —
 * this dry-run and every real encrypt — is serialized through
 * `withSharedPubLock`, so a set-then-use sequence is atomic from the worker's
 * perspective and two concurrent flows cannot interleave set→set→enc (which
 * would otherwise encrypt to the WRONG recipient — `set_shared_pub` awaits
 * `importEcdhPub` before it writes the slot, and the frozen worker does not
 * serialize message handling). The restore below is now a redundant best-effort
 * courtesy for the one long-lived attachment we keep — the inbound `?pub=`
 * deep-link key (legacy pre-attach semantics, design §14) — and may be dropped
 * in a later cleanup; a failed restore is swallowed.
 *
 * The regex fast path returns false BEFORE acquiring the lock (no slot access,
 * no reason to serialize).
 */
export async function validateRecipientKey(
  pubHex: string,
  activePubHex: string | null,
): Promise<boolean> {
  if (!RAW_KEY_RE.test(pubHex)) return false;

  return withSharedPubLock(async () => {
    let valid: boolean;
    try {
      const candidate = hexToArrayBuffer(pubHex.toLowerCase());
      await rpc.call<boolean>('set_shared_pub', { pub_buff: candidate }, [candidate]);
      valid = true;
    } catch {
      valid = false;
    }

    if (activePubHex !== null && activePubHex.toLowerCase() !== pubHex.toLowerCase()) {
      const active = hexToArrayBuffer(activePubHex.toLowerCase());
      await rpc
        .call<boolean>('set_shared_pub', { pub_buff: active }, [active])
        .catch(() => undefined);
    }

    return valid;
  });
}
