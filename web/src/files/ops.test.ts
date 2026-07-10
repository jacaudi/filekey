import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processFiles, type FileJob } from './ops';
import { rpc } from '../crypto/client';

vi.mock('../crypto/client', () => ({ rpc: { call: vi.fn() } }));

const call = vi.mocked(rpc.call);

function makeFile(name: string, bytes: number[]): File {
  return new File([new Uint8Array(bytes)], name);
}

function collect() {
  const jobs: FileJob[] = [];
  return { jobs, onJob: (j: FileJob) => jobs.push(j) };
}

beforeEach(() => {
  call.mockReset();
});

describe('processFiles', () => {
  it('encrypts a plain file via new_enc and emits salt‖ct named *.filekey', async () => {
    const salt = new Uint8Array(16).fill(7).buffer;
    const ct = new Uint8Array([9, 9]).buffer;
    call.mockResolvedValueOnce({ encrypted_buff: ct, salt });
    const { jobs, onJob } = collect();

    await processFiles([makeFile('a.png', [1, 2, 3])], onJob);

    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0][0]).toBe('new_enc');
    expect(jobs[0]).toMatchObject({ name: 'a.png', kind: 'plain', status: 'processing' });
    const done = jobs[1];
    expect(done).toMatchObject({ status: 'done', outName: 'a.png.filekey' });
    const out = new Uint8Array(done.data!);
    expect(out.length).toBe(18); // 16-byte salt ‖ 2-byte ct
    expect(out[0]).toBe(7);
    expect(out[16]).toBe(9);
  });

  it('decrypts a .filekey via new_dec with the full salt‖ct buffer', async () => {
    call.mockResolvedValueOnce({ decrypted_buff: new Uint8Array([1]).buffer });
    const { jobs, onJob } = collect();
    const bytes = Array.from({ length: 40 }, (_, i) => i);

    await processFiles([makeFile('a.png.filekey', bytes)], onJob);

    const [msgType, payload] = call.mock.calls[0];
    expect(msgType).toBe('new_dec');
    expect(new Uint8Array((payload as { msg_buff: ArrayBuffer }).msg_buff).length).toBe(40);
    expect(jobs[1]).toMatchObject({ status: 'done', outName: 'a.png', kind: 'encrypted' });
  });

  it('decrypts a .shared_filekey: first 133 bytes as pub_buff, rest as msg_buff', async () => {
    call.mockResolvedValueOnce({ decrypted_buff: new Uint8Array([1]).buffer });
    const { jobs, onJob } = collect();
    const bytes = Array.from({ length: 170 }, (_, i) => i % 251);

    await processFiles([makeFile('a.png.shared_filekey', bytes)], onJob);

    const [msgType, payload, transfer] = call.mock.calls[0];
    expect(msgType).toBe('shared_ecdh_dec');
    const p = payload as { msg_buff: ArrayBuffer; pub_buff: ArrayBuffer };
    expect(new Uint8Array(p.pub_buff).length).toBe(133);
    expect(new Uint8Array(p.pub_buff)[0]).toBe(0);
    expect(new Uint8Array(p.msg_buff).length).toBe(37);
    expect(new Uint8Array(p.msg_buff)[0]).toBe(133 % 251);
    expect(transfer).toHaveLength(2);
    expect(jobs[1]).toMatchObject({ status: 'done', outName: 'a.png', kind: 'shared' });
  });

  it('dispatches mixed batches per file; one failure does not abort the rest', async () => {
    call.mockImplementation(async (msgType: string) => {
      if (msgType === 'new_dec') throw new Error('OperationError');
      return { encrypted_buff: new Uint8Array([1]).buffer, salt: new Uint8Array(16).buffer };
    });
    const { jobs, onJob } = collect();

    await processFiles(
      [
        makeFile('bad.filekey', Array.from({ length: 40 }, () => 0)),
        makeFile('good.txt', [1]),
      ],
      onJob,
    );

    const finals = jobs.filter((j) => j.status !== 'processing');
    expect(finals).toHaveLength(2);
    expect(finals.find((j) => j.name === 'bad.filekey')?.status).toBe('error');
    expect(finals.find((j) => j.name === 'good.txt')?.status).toBe('done');
  });

  it('maps decrypt rejection after a valid parse to "wrong passkey/key"', async () => {
    call.mockRejectedValueOnce(new Error('OperationError'));
    const { jobs, onJob } = collect();

    await processFiles([makeFile('a.filekey', Array.from({ length: 40 }, () => 0))], onJob);

    expect(jobs[1]).toMatchObject({ status: 'error', error: 'wrong passkey/key' });
  });

  it('maps too-short encrypted/shared inputs to "not a FileKey file" without calling the worker', async () => {
    const { jobs, onJob } = collect();

    await processFiles(
      [
        makeFile('tiny.filekey', [1, 2, 3]), // < salt(16) + GCM tag(16)
        makeFile('tiny.shared_filekey', Array.from({ length: 100 }, () => 0)), // < 133+16+16
      ],
      onJob,
    );

    expect(call).not.toHaveBeenCalled();
    const errors = jobs.filter((j) => j.status === 'error');
    expect(errors).toHaveLength(2);
    for (const j of errors) expect(j.error).toBe('not a FileKey file');
  });

  it('assigns each file a unique id, stable across processing → done', async () => {
    call.mockResolvedValue({
      encrypted_buff: new Uint8Array([1]).buffer,
      salt: new Uint8Array(16).buffer,
    });
    const { jobs, onJob } = collect();

    await processFiles([makeFile('a', [1]), makeFile('b', [2])], onJob);

    const doneA = jobs.find((j) => j.name === 'a' && j.status === 'done')!;
    expect(jobs[0].id).toBe(doneA.id);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(2);
  });
});
