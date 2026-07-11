import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Onboarding } from './Onboarding';
import { SessionProvider } from '../state/session';

vi.mock('../crypto/client', () => ({ rpc: { call: vi.fn().mockResolvedValue(null) } }));
// Onboarding wraps a REAL <SessionProvider>, whose unlock() constructs
// WebAuthnHandler and calls getCredential — so both methods are mocked on the class,
// shared across instances via vi.hoisted so tests can configure and assert them.
const { getCredential, createCredential } = vi.hoisted(() => ({
  getCredential: vi.fn(),
  createCredential: vi.fn(),
}));
// vi.fn's implementation must be a real `function` (or `class`), not an arrow
// function, so that `new WebAuthnHandler(...)` can construct it — arrow functions
// have no [[Construct]] and vitest's mock invoker throws "is not a constructor"
// otherwise (see https://vitest.dev/api/vi#vi-spyon).
vi.mock('../crypto/webauthn', () => ({
  WebAuthnHandler: vi.fn(function () {
    return { getCredential, createCredential };
  }),
}));

const createCred = vi.mocked(createCredential);
const getCred = vi.mocked(getCredential);

function renderOnboarding(onOpenDoc = vi.fn()) {
  const ui = (
    <SessionProvider>
      <Onboarding onOpenDoc={onOpenDoc} />
    </SessionProvider>
  );
  return { ...render(ui), onOpenDoc };
}

function stubWebAuthn(platformAvailable: boolean | 'absent') {
  if (platformAvailable === 'absent') {
    // @ts-expect-error test override
    delete window.PublicKeyCredential;
    return;
  }
  // @ts-expect-error test stub
  window.PublicKeyCredential = {
    isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(platformAvailable),
  };
}

beforeEach(() => {
  createCred.mockReset();
  getCred.mockReset();
  stubWebAuthn(true);
});

describe('Onboarding', () => {
  it('shows the requirements alert up front when WebAuthn is unsupported', async () => {
    stubWebAuthn('absent');
    renderOnboarding();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/doesn't support passkeys/i);
  });

  it('shows a soft hint when no platform authenticator is available', async () => {
    stubWebAuthn(false);
    renderOnboarding();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/hardware security key/i);
    // buttons remain usable — a YubiKey still works
    expect(screen.getByRole('button', { name: /create passkey/i })).toBeEnabled();
  });

  it('renders the three steps: create → authenticate → ready', () => {
    renderOnboarding();
    // antd Steps renders a <div class="ant-steps"> (not a role="list"); scope the
    // step-title lookups to it so they don't collide with the same-named buttons.
    const steps = document.querySelector('.ant-steps') as HTMLElement;
    expect(steps).not.toBeNull();
    expect(within(steps).getByText('Create passkey')).toBeInTheDocument();
    expect(within(steps).getByText('Authenticate')).toBeInTheDocument();
    expect(within(steps).getByText('Ready')).toBeInTheDocument();
  });

  it('create passkey success advances to the authenticate step', async () => {
    createCred.mockResolvedValueOnce(new Uint8Array(16).buffer);
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: /create passkey/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^authenticate$/i })).toBeInTheDocument(),
    );
    expect(createCred).toHaveBeenCalledTimes(1);
  });

  it('create passkey failure shows an inline error with retry and a see-requirements link', async () => {
    createCred.mockResolvedValueOnce(null);
    const { onOpenDoc } = renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: /create passkey/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed/i);
    fireEvent.click(within(alert).getByRole('button', { name: /see requirements/i }));
    expect(onOpenDoc).toHaveBeenCalledWith('howItWorks');
    // retry stays available
    expect(screen.getByRole('button', { name: /create passkey/i })).toBeEnabled();
  });

  it('authenticate drives unlock() and reaches the ready step', async () => {
    getCred.mockResolvedValueOnce({
      key_mat: new Uint8Array(64).buffer,
      cred_id: new Uint8Array(16).buffer,
    });
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: /already have a filekey/i }));

    await waitFor(() => expect(getCred).toHaveBeenCalledTimes(1));
    await screen.findByText(/you're ready/i);
  });

  it('renders the brand hero lockup with a static tagline', () => {
    renderOnboarding();
    expect(screen.getByText(/your files, locked to your passkey/i)).toBeInTheDocument();
    // hero heading uses the brand name, distinct from the Steps titles
    expect(screen.getByRole('heading', { name: 'FileKey' })).toBeInTheDocument();
  });
});
