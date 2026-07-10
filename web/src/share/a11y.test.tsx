import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import { appTheme } from '../theme';

const VALID_HEX = '04' + 'a1b2'.repeat(66);

const sessionMock = {
  locked: false,
  unlock: vi.fn().mockResolvedValue(true),
  lock: vi.fn(),
  getSharePubHex: vi.fn().mockResolvedValue(VALID_HEX),
};
vi.mock('../state/session', () => ({ useSession: () => ({ ...sessionMock }) }));
vi.mock('./ShareQr', () => ({ ShareQr: () => <div data-testid="qr" /> }));
vi.mock('../files/db', () => ({ listRecipients: vi.fn().mockResolvedValue([]) }));
vi.mock('./QrScanner', () => ({
  hasCamera: vi.fn().mockResolvedValue(false),
  QrScanner: () => null,
}));
// MyShareKeyButton → ShareCenter → RecipientsPane/inbound → validate → crypto/client
// loads `new Worker(...)` at module scope; jsdom has no Worker. Mock the singleton.
vi.mock('../crypto/client', () => ({ rpc: { call: vi.fn() } }));

import { MyShareKeyButton } from './ShareCenter';

function setDesktop() {
  window.matchMedia = ((query: string) => ({
    matches: /min-width/.test(query),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

async function renderOpenCenter() {
  render(
    <ConfigProvider theme={appTheme}>
      <App>
        <MyShareKeyButton />
      </App>
    </ConfigProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'My Share Key' }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('button', { name: 'Copy link' });
  return dialog;
}

beforeEach(() => {
  setDesktop();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
  delete (navigator as unknown as Record<string, unknown>).share;
});

describe('Share Center a11y (§9)', () => {
  it('theme guarantees ≥44px large controls', () => {
    expect(appTheme.token?.controlHeightLG).toBeGreaterThanOrEqual(44);
  });

  it('Share Center interactive controls all use the large (≥44px) size', async () => {
    const dialog = await renderOpenCenter();
    const buttons = within(dialog).getAllByRole('button');
    // Scope to actual antd <Button> controls — the ones `controlHeightLG` governs.
    // The modal's own Close affordance and the Collapse disclosure header ("Raw
    // key") are not antd Buttons and carry no `size` prop to assert against.
    const actionButtons = buttons.filter((b) => b.className.includes('ant-btn'));
    expect(actionButtons.length).toBeGreaterThan(0);
    for (const b of actionButtons) {
      expect(b.className).toContain('ant-btn-lg');
    }
  });

  it('Esc closes the Share Center (antd focus trap + Esc defaults)', async () => {
    const dialog = await renderOpenCenter();
    fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 });
    // jsdom fires no real CSS transitionend; nudge antd's exit motion to
    // completion (once its listener attaches, a frame or two after Esc) so
    // the unmount already triggered by Esc can be observed.
    await waitFor(() => {
      fireEvent.transitionEnd(dialog);
      expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
    });
  });

  it('traps focus inside the dialog (antd useLockFocus default)', async () => {
    // jsdom does no layout, so every element reports `offsetParent: null` and a
    // zero-size `getBoundingClientRect()`. antd's focus-lock (@rc-component/util
    // `isVisible`) treats that as "not focusable", so the trap's redirect finds
    // nothing to focus and silently no-ops. Stub `offsetParent` so the *real*
    // production redirect logic actually runs, instead of asserting a markup
    // detail (there is no sentinel element in this antd version — the trap is a
    // window-level `focusin`/`keydown` listener, not DOM markup; see task report).
    const offsetParentSpy = vi
      .spyOn(HTMLElement.prototype, 'offsetParent', 'get')
      .mockReturnValue(document.body);
    try {
      const dialog = await renderOpenCenter();
      const outside = document.createElement('button');
      outside.textContent = 'outside the dialog';
      document.body.appendChild(outside);
      try {
        outside.focus();
        await waitFor(() => expect(document.activeElement).not.toBe(outside));
        expect(dialog.contains(document.activeElement)).toBe(true);
      } finally {
        outside.remove();
      }
    } finally {
      offsetParentSpy.mockRestore();
    }
  });
});
