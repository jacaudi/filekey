import { CryptoRpc } from './rpc';

// The one worker RPC instance shared by the whole app. session.tsx and files/ops.ts
// both import this; tests replace it with vi.mock('../crypto/client').
export const rpc = new CryptoRpc();
