// Ported from src/js/lib/webauthn.js (post required-params cleanup). Callbacks →
// async; null-on-failure semantics preserved; every WebAuthn option (alg list,
// residentKey, PRF extension, 60s timeout, random 16-byte user id/challenge) is
// byte-identical to the original.
import { combineArrayBuffers } from './buffer';

export interface RpParams { name: string; id: string }
export interface CreateCredentialParams { key_name: string; username: string }
export interface GetCredentialParams { first: ArrayBuffer; second?: ArrayBuffer; id?: ArrayBuffer }
export interface PrfCredential { key_mat: ArrayBuffer; cred_id: ArrayBuffer }

interface PrfExtensionResults {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer; second?: ArrayBuffer } };
}

export class WebAuthnHandler {
  constructor(private readonly rp: RpParams) {}

  async createCredential(params: CreateCredentialParams): Promise<ArrayBuffer | null> {
    try {
      const credential = (await navigator.credentials.create({
        publicKey: {
          rp: { name: this.rp.name, id: this.rp.id },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: params.key_name,
            displayName: params.username,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -8 },
            { type: 'public-key', alg: -257 },
          ],
          timeout: 60000,
          authenticatorSelection: { residentKey: 'required' },
          extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
          challenge: crypto.getRandomValues(new Uint8Array(16)).buffer,
        },
      })) as PublicKeyCredential | null;
      if (credential === null) return null;
      const results = credential.getClientExtensionResults() as PrfExtensionResults;
      return results.prf?.enabled === true ? credential.rawId : null;
    } catch {
      return null;
    }
  }

  async getCredential(params: GetCredentialParams): Promise<PrfCredential | null> {
    const eval_inputs: Record<string, ArrayBuffer> = { first: params.first };
    if (params.second !== undefined) eval_inputs.second = params.second;
    const publicKey: PublicKeyCredentialRequestOptions = {
      timeout: 60000,
      rpId: this.rp.id,
      challenge: crypto.getRandomValues(new Uint8Array(16)).buffer,
      extensions: { prf: { eval: eval_inputs } } as unknown as AuthenticationExtensionsClientInputs,
    };
    if (params.id !== undefined) {
      publicKey.allowCredentials = [{ type: 'public-key', id: params.id }];
    }
    try {
      const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
      if (credential === null) return null;
      const ext = credential.getClientExtensionResults() as PrfExtensionResults;
      const first = ext.prf?.results?.first;
      const second = ext.prf?.results?.second;
      if (first === undefined || second === undefined) return null;
      return { key_mat: combineArrayBuffers(first, second), cred_id: credential.rawId };
    } catch {
      return null;
    }
  }
}
