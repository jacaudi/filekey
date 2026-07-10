import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { rpc } from '../crypto/client';
import { WebAuthnHandler } from '../crypto/webauthn';
import { getPrfObject } from '../crypto/prf';
import { bufferToHex } from '../crypto/buffer';

export type Session = {
  locked: boolean;
  unlock(): Promise<boolean>;
  lock(): Promise<void>;
  getSharePubHex(): Promise<string | null>;
};

export const RP_NAME = 'Filekey';

// Relying-party derivation, parity with src/js/app/init.js: registrable domain
// unless localhost or a bare IP. The RP id is a frozen external contract — the
// same passkey must keep deriving the same keys (design §14).
export function rpId(hostname: string = window.location.hostname): string {
  const isIp = /^[\d.]+$/.test(hostname) || hostname.includes(':');
  if (hostname === 'localhost' || isIp) return hostname;
  const parts = hostname.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : hostname;
}

// Single source of the relying-party handler construction. The RP `{ name, id }` is a
// frozen external contract (design §14 — the same passkey must keep deriving the same
// keys), so both `unlock()` here and Onboarding's `createCredential` build the handler
// through this one factory rather than each spelling out the args (avoids RP-id drift).
export function newRpHandler(): WebAuthnHandler {
  return new WebAuthnHandler({ name: RP_NAME, id: rpId() });
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(true);

  const unlock = useCallback(async (): Promise<boolean> => {
    const wa = newRpHandler();
    const { first, second } = getPrfObject();
    const cred = await wa.getCredential({ first, second }).catch(() => null);
    if (!cred) return false;
    await rpc.call('prf_to_key', { prf_buff: cred.key_mat }, [cred.key_mat]);
    await rpc.call('set_seed', { seed_name: '_0' });
    setLocked(false);
    return true;
  }, []);

  const lock = useCallback(async (): Promise<void> => {
    await rpc.call('clear_keys');
    setLocked(true);
  }, []);

  const getSharePubHex = useCallback(async (): Promise<string | null> => {
    const buf = await rpc.call<ArrayBuffer | null>('get_det_public_ecdh');
    return buf ? bufferToHex(buf) : null;
  }, []);

  const value = useMemo(
    () => ({ locked, unlock, lock, getSharePubHex }),
    [locked, unlock, lock, getSharePubHex],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
