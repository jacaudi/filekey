import { str_keccak256 } from './keccak';
import { hexToArrayBuffer } from './buffer';

export type PrfEvalInputs = {
  id: ArrayBuffer | null;
  first: ArrayBuffer;
  second: ArrayBuffer;
};

// Static PRF eval inputs — one passkey auth derives everything (design §2.2).
// Ported from src/js/app/crypto-ops.js:121-129. These strings are a frozen
// external contract: changing them changes every derived key.
const FIRST_INPUT = 'filekey_security_key_wallet_first';
const SECOND_INPUT = 'filekey_security_key_wallet_second';

export function getPrfObject(id: ArrayBuffer | null = null): PrfEvalInputs {
  return {
    id,
    first: hexToArrayBuffer(str_keccak256(FIRST_INPUT)),
    second: hexToArrayBuffer(str_keccak256(SECOND_INPUT)),
  };
}
