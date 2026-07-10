import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from 'antd';
import type { FileJob } from '../files/ops';
import type { Recipient } from '../files/db';
import { InboundShareContext } from './inbound';

const VALID_HEX = '04' + 'a1b2'.repeat(66);
const OTHER_HEX = '04' + 'c3d4'.repeat(66);

const sessionMock = {
  locked: false,
  unlock: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  lock: vi.fn(),
  getSharePubHex: vi.fn(),
};
vi.mock('../state/session', () => ({ useSession: () => ({ ...sessionMock }) }));

const db = { listRecipients: vi.fn<() => Promise<Recipient[]>>() };
vi.mock('../files/db', () => ({ listRecipients: () => db.listRecipients() }));

// `vi.mock('./shareFile', importOriginal)` below re-loads the REAL shareFile.ts,
// which imports `../crypto/client` (runs `new Worker(...)` at module scope); jsdom
// has no Worker. Mock the singleton so the importOriginal() call cannot crash.
vi.mock('../crypto/client', () => ({ rpc: { call: vi.fn() } }));

const encryptForRecipient = vi.fn();
vi.mock('./shareFile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./shareFile')>();
  return {
    ...actual,
    encryptForRecipient: (...a: unknown[]) => encryptForRecipient(...a),
  };
});

const downloadBlob = vi.fn();
vi.mock('../files/save', () => ({ downloadBlob: (...a: unknown[]) => downloadBlob(...a) }));

vi.mock('./RecipientsPane', () => ({
  AddRecipientControl: ({ onAdded }: { onAdded: (r: Recipient) => void }) => (
    <button
      type="button"
      onClick={() => onAdded({ id: 'id-new', name: 'Carol', pubHex: OTHER_HEX, createdTs: 3 })}
    >
      mock-add-recipient
    </button>
  ),
}));

import { ShareFileAction } from './ShareFileAction';

const job: FileJob = {
  id: 'job-1',
  name: 'photo.jpg.filekey',
  kind: 'encrypted',
  status: 'done',
  outName: 'photo.jpg',
  data: new Uint8Array([1, 2, 3]).buffer,
};

const alice: Recipient = { id: 'id-1', name: 'Alice', pubHex: VALID_HEX, createdTs: 1 };

function renderAction(inbound: { pubHex: string; recipientName: string | null } | null = null) {
  return render(
    <App>
      <InboundShareContext.Provider value={inbound}>
        <ShareFileAction job={job} />
      </InboundShareContext.Provider>
    </App>,
  );
}

async function openPicker() {
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
  return await screen.findByRole('dialog');
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.locked = false;
  sessionMock.unlock.mockResolvedValue(true);
  db.listRecipients.mockResolvedValue([alice]);
  encryptForRecipient.mockResolvedValue(new Uint8Array(133 + 16 + 4).buffer);
  delete (navigator as unknown as Record<string, unknown>).share;
  delete (navigator as unknown as Record<string, unknown>).canShare;
});

describe('picker flow', () => {
  it('encrypts to the selected saved recipient and shows the result filename', async () => {
    const dialog = await (renderAction(), openPicker());
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByTitle('Alice (04a1…a1b2)'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Encrypt for recipient' }));
    await waitFor(() =>
      expect(encryptForRecipient).toHaveBeenCalledWith(job.data, VALID_HEX),
    );
    expect(
      await within(dialog).findByText('photo.jpg.shared_filekey'),
    ).toBeInTheDocument();
  });

  it('offers New recipient inline and uses the newly added key', async () => {
    const dialog = await (renderAction(), openPicker());
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByTitle('New recipient…'));
    fireEvent.click(await within(dialog).findByRole('button', { name: 'mock-add-recipient' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Encrypt for recipient' }));
    await waitFor(() =>
      expect(encryptForRecipient).toHaveBeenCalledWith(job.data, OTHER_HEX),
    );
  });

  it('preselects the inbound ?pub= key', async () => {
    renderAction({ pubHex: OTHER_HEX, recipientName: null });
    const dialog = await openPicker();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Encrypt for recipient' }));
    await waitFor(() =>
      expect(encryptForRecipient).toHaveBeenCalledWith(job.data, OTHER_HEX),
    );
  });

  it('fires unlock() from the Share click when locked', async () => {
    sessionMock.locked = true;
    let release!: (ok: boolean) => void;
    sessionMock.unlock.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          release = (ok) => {
            sessionMock.locked = !ok;
            resolve(ok);
          };
        }),
    );
    renderAction();
    const dialog = await openPicker();
    expect(sessionMock.unlock).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByLabelText('Waiting for passkey')).toBeInTheDocument();
    release(true);
    expect(await within(dialog).findByRole('combobox')).toBeInTheDocument();
  });

  it('shows inline retry when unlock fails, and retry re-prompts (§9, no dead-end)', async () => {
    sessionMock.locked = true;
    sessionMock.unlock.mockResolvedValueOnce(false);
    renderAction();
    const dialog = await openPicker();
    const retry = await within(dialog).findByRole('button', { name: 'Try again' });
    expect(within(dialog).getByText('Passkey authentication failed')).toBeInTheDocument();

    sessionMock.unlock.mockImplementation(async () => {
      sessionMock.locked = false;
      return true;
    });
    fireEvent.click(retry);
    expect(await within(dialog).findByRole('combobox')).toBeInTheDocument();
    expect(sessionMock.unlock).toHaveBeenCalledTimes(2);
  });

  it('clears the spinner and shows inline retry when unlock() rejects (worker key-derivation failure)', async () => {
    sessionMock.locked = true;
    sessionMock.unlock.mockRejectedValueOnce(new Error('prf_to_key failed'));
    renderAction();
    const dialog = await openPicker();
    expect(
      await within(dialog).findByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Passkey authentication failed')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Waiting for passkey')).toBeNull();
  });
});

describe('result actions — capability-detected ordering (D6, §8.2)', () => {
  async function encryptToResult(dialog: HTMLElement) {
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByTitle('Alice (04a1…a1b2)'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Encrypt for recipient' }));
    await within(dialog).findByText('photo.jpg.shared_filekey');
  }

  it('share-first when canShare({files}) is true; shares the File', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
    });
    const dialog = await (renderAction(), openPicker());
    await encryptToResult(dialog);
    const shareBtn = within(dialog).getByRole('button', { name: 'Share file' });
    expect(shareBtn.className).toContain('ant-btn-primary');
    fireEvent.click(shareBtn);
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const { files } = share.mock.calls[0][0] as { files: File[] };
    expect(files[0].name).toBe('photo.jpg.shared_filekey');
    expect(files[0].type).toBe('application/octet-stream');
  });

  it('swallows AbortError when the user dismisses the share sheet', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
      configurable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
    });
    const dialog = await (renderAction(), openPicker());
    await encryptToResult(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Share file' }));
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(screen.queryByText('Could not open the share sheet')).toBeNull();
  });

  it('save-only when file sharing is unavailable', async () => {
    const dialog = await (renderAction(), openPicker());
    await encryptToResult(dialog);
    expect(within(dialog).queryByRole('button', { name: 'Share file' })).toBeNull();
    const saveBtn = within(dialog).getByRole('button', { name: 'Save' });
    expect(saveBtn.className).toContain('ant-btn-primary');
    fireEvent.click(saveBtn);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(downloadBlob.mock.calls[0][1]).toBe('photo.jpg.shared_filekey');
  });
});
