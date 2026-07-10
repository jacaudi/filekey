import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from 'antd';

const VALID_HEX = '04' + 'a1b2'.repeat(66);

const sessionMock = {
  locked: false,
  unlock: vi.fn<() => Promise<boolean>>(),
  lock: vi.fn(),
  getSharePubHex: vi.fn<() => Promise<string | null>>(),
};
vi.mock('../state/session', () => ({ useSession: () => ({ ...sessionMock }) }));
vi.mock('./ShareQr', () => ({
  ShareQr: ({ link }: { link: string }) => <div data-testid="qr" data-link={link} />,
}));
// ShareCenter → (Task 8/9) RecipientsPane/inbound → validate → crypto/client, which
// constructs `new Worker(...)` at module scope; jsdom has no Worker. Mock the singleton.
vi.mock('../crypto/client', () => ({ rpc: { call: vi.fn() } }));
// RecipientsPane renders live in the pane-switch test below.
vi.mock('../files/db', () => ({ listRecipients: vi.fn().mockResolvedValue([]) }));
vi.mock('./QrScanner', () => ({
  hasCamera: vi.fn().mockResolvedValue(false),
  QrScanner: () => null,
}));

import { MyShareKeyButton } from './ShareCenter';

function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop ? /min-width/.test(query) : false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function renderCenter() {
  return render(
    <App>
      <MyShareKeyButton />
    </App>,
  );
}

async function openCenter() {
  fireEvent.click(screen.getByRole('button', { name: 'My Share Key' }));
  return await screen.findByRole('dialog');
}

beforeEach(() => {
  setViewport(true); // desktop Modal by default
  sessionMock.locked = false;
  sessionMock.unlock.mockReset().mockResolvedValue(true);
  sessionMock.getSharePubHex.mockReset().mockResolvedValue(VALID_HEX);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
  delete (navigator as unknown as Record<string, unknown>).share;
});

describe('lock gating', () => {
  it('fires unlock() directly from the click when locked and shows a spinner', async () => {
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
    renderCenter();
    const dialog = await openCenter();
    expect(sessionMock.unlock).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByLabelText('Waiting for passkey')).toBeInTheDocument();

    release(true);
    expect(
      await within(dialog).findByRole('button', { name: 'Copy link' }),
    ).toBeInTheDocument();
  });

  it('does not call unlock() when already unlocked', async () => {
    renderCenter();
    await openCenter();
    expect(sessionMock.unlock).not.toHaveBeenCalled();
  });

  it('renders inline retry + requirements when unlock fails, and retry re-prompts', async () => {
    sessionMock.locked = true;
    sessionMock.unlock.mockResolvedValueOnce(false);
    renderCenter();
    const dialog = await openCenter();
    const retry = await within(dialog).findByRole('button', { name: 'Try again' });
    expect(within(dialog).getByText('Passkey authentication failed')).toBeInTheDocument();
    expect(within(dialog).getByText(/requirements/i)).toBeInTheDocument();

    sessionMock.unlock.mockImplementation(async () => {
      sessionMock.locked = false;
      return true;
    });
    fireEvent.click(retry);
    expect(
      await within(dialog).findByRole('button', { name: 'Copy link' }),
    ).toBeInTheDocument();
    expect(sessionMock.unlock).toHaveBeenCalledTimes(2);
  });
});

describe('My Key pane — capability-detected ordering (D6)', () => {
  it('without navigator.share: Copy link is the primary action, no Share my link', async () => {
    renderCenter();
    const dialog = await openCenter();
    const copy = await within(dialog).findByRole('button', { name: 'Copy link' });
    expect(copy.className).toContain('ant-btn-primary');
    expect(within(dialog).queryByRole('button', { name: 'Share my link' })).toBeNull();
  });

  it('with navigator.share: Share my link is primary and calls share with the deep link', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderCenter();
    const dialog = await openCenter();
    const btn = await within(dialog).findByRole('button', { name: 'Share my link' });
    expect(btn.className).toContain('ant-btn-primary');
    fireEvent.click(btn);
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        url: `${location.origin}/?pub=${VALID_HEX}`,
        title: 'FileKey',
        text: 'Send me encrypted files with FileKey',
      }),
    );
  });

  it('swallows AbortError when the user dismisses the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderCenter();
    const dialog = await openCenter();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Share my link' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(screen.queryByText('Could not open the share sheet')).toBeNull();
  });

  it('copies the deep link and announces Copied via an aria-live toast', async () => {
    renderCenter();
    const dialog = await openCenter();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Copy link' }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${location.origin}/?pub=${VALID_HEX}`,
      ),
    );
    const toast = await screen.findByText('Copied');
    expect(
      toast.closest('[role="alert"], [aria-live="polite"], [aria-live="assertive"]'),
    ).not.toBeNull();
  });

  it('renders the QR of the deep link and a collapsed raw-key row with Copy', async () => {
    renderCenter();
    const dialog = await openCenter();
    await within(dialog).findByRole('button', { name: 'Copy link' });
    expect(within(dialog).getByTestId('qr').dataset.link).toBe(
      `${location.origin}/?pub=${VALID_HEX}`,
    );
    // collapsed by default: hex not visible until the Raw key row is expanded
    expect(within(dialog).queryByText(VALID_HEX)).toBeNull();
    fireEvent.click(within(dialog).getByText('Raw key'));
    expect(await within(dialog).findByText(VALID_HEX)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy raw key' }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(VALID_HEX),
    );
  });
});

describe('container by breakpoint', () => {
  it('uses a bottom Drawer on mobile and a Modal on desktop', async () => {
    setViewport(false);
    const { unmount } = renderCenter();
    fireEvent.click(screen.getByRole('button', { name: 'My Share Key' }));
    await waitFor(() =>
      expect(document.querySelector('.ant-drawer-bottom')).not.toBeNull(),
    );
    expect(document.querySelector('.ant-modal')).toBeNull();
    unmount();

    setViewport(true);
    renderCenter();
    fireEvent.click(screen.getByRole('button', { name: 'My Share Key' }));
    await waitFor(() => expect(document.querySelector('.ant-modal')).not.toBeNull());
    expect(document.querySelector('.ant-drawer-bottom')).toBeNull();
  });
});

describe('pane switching', () => {
  it('switches to the Recipients pane via the segmented control', async () => {
    renderCenter();
    const dialog = await openCenter();
    await within(dialog).findByRole('button', { name: 'Copy link' });
    fireEvent.click(within(dialog).getByText('Recipients'));
    expect(
      await within(dialog).findByRole('textbox', { name: 'Share key or link' }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Copy link' })).toBeNull();
  });
});
