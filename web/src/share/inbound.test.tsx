import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from 'antd';
import type { Recipient } from '../files/db';

const VALID_HEX = '04' + 'a1b2'.repeat(66);

const db = {
  listRecipients: vi.fn<() => Promise<Recipient[]>>(),
  addRecipient: vi.fn(),
};
vi.mock('../files/db', () => ({
  listRecipients: () => db.listRecipients(),
  addRecipient: (...a: unknown[]) => db.addRecipient(...a),
}));

const validateRecipientKey = vi.fn();
vi.mock('./validate', () => ({
  validateRecipientKey: (...a: unknown[]) => validateRecipientKey(...a),
}));

import { InboundShareBanner, resolveInboundShare } from './inbound';

beforeEach(() => {
  vi.clearAllMocks();
  db.listRecipients.mockResolvedValue([]);
  db.addRecipient.mockImplementation(async (name: string, pubHex: string) => ({
    id: 'id-new',
    name,
    pubHex,
    createdTs: 1,
  }));
  validateRecipientKey.mockResolvedValue(true);
});

describe('resolveInboundShare', () => {
  it('returns null when there is no pub param', async () => {
    expect(await resolveInboundShare('')).toBeNull();
    expect(await resolveInboundShare('?theme=dark')).toBeNull();
    expect(validateRecipientKey).not.toHaveBeenCalled();
  });

  it('returns invalid for a malformed or off-curve key', async () => {
    expect(await resolveInboundShare('?pub=04deadbeef')).toBe('invalid');
    validateRecipientKey.mockResolvedValue(false);
    expect(await resolveInboundShare(`?pub=${VALID_HEX}`)).toBe('invalid');
  });

  it('validates with no restore target (the inbound key IS the active key)', async () => {
    await resolveInboundShare(`?pub=${VALID_HEX}`);
    expect(validateRecipientKey).toHaveBeenCalledWith(VALID_HEX, null);
  });

  it('matches a saved recipient by pubHex and carries its name', async () => {
    db.listRecipients.mockResolvedValue([
      { id: 'id-1', name: 'Alice', pubHex: VALID_HEX, createdTs: 1 },
    ]);
    expect(await resolveInboundShare(`?pub=${VALID_HEX.toUpperCase()}`)).toEqual({
      pubHex: VALID_HEX,
      recipientName: 'Alice',
    });
  });

  it('carries a null name for an unknown key', async () => {
    expect(await resolveInboundShare(`?pub=${VALID_HEX}`)).toEqual({
      pubHex: VALID_HEX,
      recipientName: null,
    });
  });
});

describe('InboundShareBanner', () => {
  it('shows the saved recipient name and no Save action when matched', () => {
    render(
      <App>
        <InboundShareBanner
          share={{ pubHex: VALID_HEX, recipientName: 'Alice' }}
          onSaved={vi.fn()}
          onDismiss={vi.fn()}
        />
      </App>,
    );
    expect(screen.getByText('Sharing to Alice')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save as recipient' })).toBeNull();
  });

  it('shows the truncated key and saves as a named recipient', async () => {
    const onSaved = vi.fn();
    render(
      <App>
        <InboundShareBanner
          share={{ pubHex: VALID_HEX, recipientName: null }}
          onSaved={onSaved}
          onDismiss={vi.fn()}
        />
      </App>,
    );
    expect(screen.getByText('Sharing to 04a1…a1b2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save as recipient' }));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByRole('textbox', { name: 'Recipient name' }), {
      target: { value: 'Alice' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(db.addRecipient).toHaveBeenCalledWith('Alice', VALID_HEX));
    expect(onSaved).toHaveBeenCalledWith('Alice');
  });

  it('dismisses', () => {
    const onDismiss = vi.fn();
    render(
      <App>
        <InboundShareBanner
          share={{ pubHex: VALID_HEX, recipientName: null }}
          onSaved={vi.fn()}
          onDismiss={onDismiss}
        />
      </App>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders as a full-width page banner', () => {
    render(
      <App>
        <InboundShareBanner
          share={{ pubHex: VALID_HEX, recipientName: 'Alice' }}
          onSaved={vi.fn()}
          onDismiss={vi.fn()}
        />
      </App>,
    );
    expect(document.querySelector('.ant-alert-banner')).not.toBeNull();
  });
});
