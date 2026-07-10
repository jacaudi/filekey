// Promise-based worker RPC with correlation IDs. Replaces the old one-shot
// sendMessageToWorker listener whose in-flight replies could swap (design §2.3).
// Wire protocol (shared contract): request {id, msg_type, ...payload};
// reply {id, ok: true, result} | {id, ok: false, error}. The worker echoes the id
// on EVERY reply; id -1 marks a global-error reply the worker could not attribute,
// which belongs to the oldest pending request.

export type MsgType =
  | 'prf_to_key'
  | 'set_seed'
  | 'get_det_public_ecdh'
  | 'new_enc'
  | 'new_dec'
  | 'set_shared_pub'
  | 'shared_ecdh_enc'
  | 'shared_ecdh_dec'
  | 'clear_keys';

export interface RpcReply {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (ev: { data: RpcReply }) => void): void;
  terminate(): void;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

export class CryptoRpc {
  private readonly worker: WorkerLike;
  private readonly pending = new Map<number, Pending>();
  private next_id = 1;

  constructor(worker?: WorkerLike) {
    this.worker =
      worker ??
      (new Worker(new URL('./worker/index.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike);
    this.worker.addEventListener('message', (ev) => this.onReply(ev.data));
  }

  call<T>(msgType: MsgType, payload: Record<string, unknown> = {}, transfer: Transferable[] = []): Promise<T> {
    const id = this.next_id++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      // Spread first so payload keys can never clobber id/msg_type.
      this.worker.postMessage({ ...payload, id, msg_type: msgType }, transfer);
    });
  }

  terminate(): void {
    this.worker.terminate();
    for (const entry of this.pending.values()) {
      entry.reject(new Error('worker terminated'));
    }
    this.pending.clear();
  }

  private onReply(reply: RpcReply): void {
    let id = reply.id;
    if (!this.pending.has(id)) {
      if (id !== -1) return; // stray/late reply — nothing to do
      const oldest = this.pending.keys().next();
      if (oldest.done === true) return;
      id = oldest.value;
    }
    const entry = this.pending.get(id)!;
    this.pending.delete(id);
    if (reply.ok) {
      entry.resolve(reply.result);
    } else {
      entry.reject(new Error(reply.error ?? 'worker error'));
    }
  }
}
