import { describe, expect, it } from 'vitest';
import { CryptoRpc, type RpcReply, type WorkerLike } from '../src/crypto/rpc';

class FakeWorker implements WorkerLike {
  sent: Array<{ id: number; msg_type: string } & Record<string, unknown>> = [];
  terminated = false;
  private listener: ((ev: { data: RpcReply }) => void) | null = null;

  postMessage(message: unknown): void {
    this.sent.push(message as { id: number; msg_type: string });
  }
  addEventListener(_type: 'message', listener: (ev: { data: RpcReply }) => void): void {
    this.listener = listener;
  }
  terminate(): void {
    this.terminated = true;
  }
  reply(data: RpcReply): void {
    this.listener!({ data });
  }
}

describe('CryptoRpc correlation IDs (design §11 required concurrency test)', () => {
  it('flattens payload into the request and stamps unique ids', () => {
    const w = new FakeWorker();
    const rpc = new CryptoRpc(w);
    void rpc.call('set_seed', { seed_name: '_0' });
    void rpc.call('clear_keys');
    expect(w.sent[0]).toEqual({ id: w.sent[0].id, msg_type: 'set_seed', seed_name: '_0' });
    expect(w.sent[1].msg_type).toBe('clear_keys');
    expect(w.sent[0].id).not.toBe(w.sent[1].id);
  });

  it('resolves overlapping requests with their own replies even when they arrive out of order', async () => {
    const w = new FakeWorker();
    const rpc = new CryptoRpc(w);
    const p1 = rpc.call<string>('new_enc', { msg_buff: 1 });
    const p2 = rpc.call<string>('new_dec', { msg_buff: 2 });
    const p3 = rpc.call<string>('get_det_public_ecdh');
    const [id1, id2, id3] = w.sent.map((m) => m.id);
    w.reply({ id: id3, ok: true, result: 'r3' });
    w.reply({ id: id1, ok: true, result: 'r1' });
    w.reply({ id: id2, ok: true, result: 'r2' });
    expect(await p1).toBe('r1');
    expect(await p2).toBe('r2');
    expect(await p3).toBe('r3');
  });

  it('rejects exactly the failing request; siblings still resolve', async () => {
    const w = new FakeWorker();
    const rpc = new CryptoRpc(w);
    const p1 = rpc.call('new_dec', { msg_buff: 1 });
    const p2 = rpc.call('new_enc', { msg_buff: 2 });
    const [id1, id2] = w.sent.map((m) => m.id);
    w.reply({ id: id1, ok: false, error: 'OperationError: GCM auth failed' });
    w.reply({ id: id2, ok: true, result: 'fine' });
    await expect(p1).rejects.toThrow('GCM auth failed');
    expect(await p2).toBe('fine');
  });

  it('routes an unattributed id:-1 error to the oldest pending request', async () => {
    const w = new FakeWorker();
    const rpc = new CryptoRpc(w);
    const oldest = rpc.call('set_seed', { seed_name: '_0' });
    const newer = rpc.call('clear_keys');
    w.reply({ id: -1, ok: false, error: 'unhandled rejection: boom' });
    await expect(oldest).rejects.toThrow('boom');
    w.reply({ id: w.sent[1].id, ok: true, result: null });
    expect(await newer).toBeNull();
  });

  it('ignores replies for unknown ids (no crash, no cross-talk)', async () => {
    const w = new FakeWorker();
    const rpc = new CryptoRpc(w);
    const p = rpc.call('clear_keys');
    w.reply({ id: 999999, ok: true, result: 'stray' });
    w.reply({ id: w.sent[0].id, ok: true, result: null });
    expect(await p).toBeNull();
  });

  it('terminate() rejects all pending requests and terminates the worker', async () => {
    const w = new FakeWorker();
    const rpc = new CryptoRpc(w);
    const p = rpc.call('set_seed', { seed_name: '_0' });
    rpc.terminate();
    await expect(p).rejects.toThrow('worker terminated');
    expect(w.terminated).toBe(true);
  });
});
