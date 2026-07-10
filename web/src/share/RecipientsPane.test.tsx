import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from 'antd';
import type { Recipient } from '../files/db';

const VALID_HEX = '04' + 'a1b2'.repeat(66);
const DEEP_LINK = `https://filekey.example/?pub=${VALID_HEX}`;

const db = {
  listRecipients: vi.fn<() => Promise<Recipient[]>>(),
  addRecipient: vi.fn(),
  renameRecipient: vi.fn().mockResolvedValue(undefined),
  deleteRecipient: vi.fn().mockResolvedValue(undefined),
};
vi.mock('../files/db', () => ({
  listRecipients: (...a: unknown[]) => db.listRecipients(...(a as [])),
  addRecipient: (...a: unknown[]) => db.addRecipient(...a),
  renameRecipient: (...a: unknown[]) => db.renameRecipient(...a),
  deleteRecipient: (...a: unknown[]) => db.deleteRecipient(...a),
}));

const validateRecipientKey = vi.fn();
vi.mock('./validate', () => ({
  validateRecipientKey: (...a: unknown[]) => validateRecipientKey(...a),
}));

const hasCamera = vi.fn();
const qrScannerProps = vi.fn();
vi.mock('./QrScanner', () => ({
  hasCamera: () => hasCamera(),
  QrScanner: (props: { onScan: (hex: string) => void; onClose: () => void }) => {
    qrScannerProps(props);
    return <div data-testid="qr-scanner" />;
  },
}));

import { RecipientsPane } from './RecipientsPane';

const alice: Recipient = { id: 'id-1', name: 'Alice', pubHex: VALID_HEX, createdTs: 1 };

function renderPane(activePubHex: string | null = null) {
  return render(
    <App>
      <RecipientsPane activePubHex={activePubHex} />
    </App>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  db.listRecipients.mockResolvedValue([alice]);
  db.addRecipient.mockImplementation(async (name: string, pubHex: string) => ({
    id: 'id-new',
    name,
    pubHex: pubHex.toLowerCase(),
    createdTs: 2,
  }));
  validateRecipientKey.mockResolvedValue(true);
  hasCamera.mockResolvedValue(true);
});

describe('list', () => {
  it('shows name and truncated key (04a1…a1b2 format)', async () => {
    renderPane();
    const item = (await screen.findByText('Alice')).closest('li') as HTMLElement;
    expect(within(item).getByText('04a1…a1b2')).toBeInTheDocument();
  });
});

describe('add — validated paste field', () => {
  it('adds a recipient from a raw hex paste', async () => {
    renderPane();
    fireEvent.change(await screen.findByRole('textbox', { name: 'Share key or link' }), {
      target: { value: VALID_HEX },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Recipient name' }), {
      target: { value: 'Bob' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(validateRecipientKey).toHaveBeenCalledWith(VALID_HEX, null),
    );
    expect(db.addRecipient).toHaveBeenCalledWith('Bob', VALID_HEX);
  });

  it('passes activePubHex through to validation (restore protocol)', async () => {
    const ACTIVE = '04' + 'c3d4'.repeat(66);
    renderPane(ACTIVE);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Share key or link' }), {
      target: { value: VALID_HEX },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(validateRecipientKey).toHaveBeenCalledWith(VALID_HEX, ACTIVE),
    );
  });

  it('extracts the key from a pasted deep link', async () => {
    renderPane();
    fireEvent.change(await screen.findByRole('textbox', { name: 'Share key or link' }), {
      target: { value: DEEP_LINK },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(db.addRecipient).toHaveBeenCalled());
    expect(db.addRecipient.mock.calls[0][1]).toBe(VALID_HEX);
  });

  it('shows live invalid state and disables Add for garbage', async () => {
    renderPane();
    fireEvent.change(await screen.findByRole('textbox', { name: 'Share key or link' }), {
      target: { value: 'not a key' },
    });
    expect(screen.getByText('Not a valid Share Key or link')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(db.addRecipient).not.toHaveBeenCalled();
  });

  it('reports an off-curve key rejected by the worker dry-run', async () => {
    validateRecipientKey.mockResolvedValue(false);
    renderPane();
    fireEvent.change(await screen.findByRole('textbox', { name: 'Share key or link' }), {
      target: { value: VALID_HEX },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(
      await screen.findByText('That is not a valid FileKey Share Key'),
    ).toBeInTheDocument();
    expect(db.addRecipient).not.toHaveBeenCalled();
  });
});

describe('scan QR', () => {
  it('hides the Scan button entirely when no camera is present', async () => {
    hasCamera.mockResolvedValue(false);
    renderPane();
    await screen.findByText('Alice');
    expect(screen.queryByRole('button', { name: 'Scan QR' })).toBeNull();
  });

  it('opens the scanner and fills the field with the scanned key', async () => {
    renderPane();
    fireEvent.click(await screen.findByRole('button', { name: 'Scan QR' }));
    await screen.findByTestId('qr-scanner');
    const { onScan } = qrScannerProps.mock.calls[0][0] as {
      onScan: (hex: string) => void;
    };
    onScan(VALID_HEX);
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Share key or link' })).toHaveValue(
        VALID_HEX,
      ),
    );
    expect(screen.queryByTestId('qr-scanner')).toBeNull();
  });
});

describe('rename and delete', () => {
  it('renames via a Modal prompt', async () => {
    renderPane();
    const item = (await screen.findByText('Alice')).closest('li') as HTMLElement;
    fireEvent.click(within(item).getByRole('button', { name: 'Rename' }));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByRole('textbox', { name: 'Recipient name' }), {
      target: { value: 'Alice Work' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(db.renameRecipient).toHaveBeenCalledWith('id-1', 'Alice Work'),
    );
  });

  it('deletes behind a Popconfirm', async () => {
    renderPane();
    const item = (await screen.findByText('Alice')).closest('li') as HTMLElement;
    fireEvent.click(within(item).getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(db.deleteRecipient).toHaveBeenCalledWith('id-1'));
  });
});
