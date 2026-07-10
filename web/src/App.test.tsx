import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { SessionProvider } from './state/session';
import { ThemeProvider } from './theme';
import { rpc } from './crypto/client';
import { clearJobs } from './files/db';

vi.mock('./crypto/client', () => ({ rpc: { call: vi.fn().mockResolvedValue(null) } }));
// Class mock with shared getCredential/createCredential (vi.hoisted) — the real
// SessionProvider constructs WebAuthnHandler and calls getCredential during unlock().
const { getCredential, createCredential } = vi.hoisted(() => ({
  getCredential: vi.fn(),
  createCredential: vi.fn(),
}));
vi.mock('./crypto/webauthn', () => ({
  // Regular function, not an arrow: App wraps a real <SessionProvider> whose
  // unlock() does `new WebAuthnHandler()` — arrows have no [[Construct]].
  WebAuthnHandler: vi.fn(function () {
    return { getCredential, createCredential };
  }),
}));
vi.mock('./files/db', () => ({
  saveJob: vi.fn().mockResolvedValue(undefined),
  getJob: vi.fn().mockResolvedValue(null),
  clearJobs: vi.fn().mockResolvedValue(undefined),
  clearRecipients: vi.fn().mockResolvedValue(undefined),
  requestPersistence: vi.fn().mockResolvedValue(true),
  // resolveInboundShare (inbound.tsx) looks up saved recipients by pubHex.
  listRecipients: vi.fn().mockResolvedValue([]),
}));

const call = vi.mocked(rpc.call);
const getCred = vi.mocked(getCredential);

const VALID_PUB = '04' + 'a'.repeat(264);

function renderApp() {
  return render(
    <ThemeProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  call.mockClear();
  call.mockResolvedValue(null);
  getCred.mockReset();
  window.history.replaceState({}, '', '/');
  // @ts-expect-error test stub for onboarding capability detection
  window.PublicKeyCredential = {
    isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
  };
});

describe('App', () => {
  it('starts on onboarding and clears the session job cache on init', async () => {
    renderApp();
    // "Create passkey" renders in BOTH the antd Steps title and the primary Button —
    // scope to the button to avoid RTL's "multiple elements" throw (parity with Task 8).
    expect(screen.getByRole('button', { name: /create passkey/i })).toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(clearJobs)).toHaveBeenCalled());
  });

  it('shows the inbound share banner for a valid ?pub= key', async () => {
    window.history.replaceState({}, '', `/?pub=${VALID_PUB}`);
    call.mockImplementation(async (t: string) => (t === 'set_shared_pub' ? true : null));
    renderApp();

    expect(await screen.findByText(/sharing to 04aa…aaaa/i)).toBeInTheDocument();
  });

  it('ignores an invalid ?pub= value', async () => {
    window.history.replaceState({}, '', '/?pub=deadbeef');
    renderApp();
    await waitFor(() => expect(vi.mocked(clearJobs)).toHaveBeenCalled());
    expect(screen.queryByText(/sharing to/i)).toBeNull();
  });

  it('unlocking swaps onboarding for the drop zone; reset returns to onboarding', async () => {
    getCred.mockResolvedValue({
      key_mat: new Uint8Array(64).buffer,
      cred_id: new Uint8Array(16).buffer,
    });
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /already have a filekey/i }));
    await screen.findByTestId('fk-dropzone');
    expect(within(screen.getByRole('banner')).getByText('Unlocked')).toBeInTheDocument();

    // Reset: menu → Reset → clears keys + cache and replays onboarding
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Reset'));
    await waitFor(() => expect(call).toHaveBeenCalledWith('clear_keys'));
    expect(vi.mocked(clearJobs).mock.calls.length).toBeGreaterThanOrEqual(2);
    // Back on onboarding — scope to the button (see the init test's note).
    await screen.findByRole('button', { name: /create passkey/i });
  });
});
