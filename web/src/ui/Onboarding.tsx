import { Alert, Button, Space, Steps, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { newRpHandler, useSession } from '../state/session';
import type { DocKey } from './content';

type Capability = 'checking' | 'ok' | 'no-platform' | 'unsupported';

export function Onboarding({ onOpenDoc }: { onOpenDoc: (key: DocKey) => void }) {
  const { locked, unlock } = useSession();
  const [capability, setCapability] = useState<Capability>('checking');
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window.PublicKeyCredential === 'undefined') {
        setCapability('unsupported');
        return;
      }
      try {
        const avail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!cancelled) setCapability(avail ? 'ok' : 'no-platform');
      } catch {
        if (!cancelled) setCapability('no-platform');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = !locked ? 2 : created ? 1 : 0;

  async function handleCreate() {
    setBusy(true);
    setError(null);
    const wa = newRpHandler();
    const rawId = await wa
      .createCredential({ key_name: 'Filekey', username: 'default_user' })
      .catch(() => null);
    setBusy(false);
    if (rawId !== null) setCreated(true);
    else setError('Failed to create a passkey. Your authenticator may not support PRF.');
  }

  async function handleAuthenticate() {
    setBusy(true);
    setError(null);
    const ok = await unlock();
    setBusy(false);
    if (!ok) setError('Authentication failed. Please try again.');
  }

  const seeRequirements = (
    <Button type="link" size="small" onClick={() => onOpenDoc('howItWorks')}>
      See requirements
    </Button>
  );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 560 }}>
      <Typography.Paragraph>
        <strong>Files need protection. FileKey secures them.</strong> Works with passkeys. Drop
        files in — they lock. Drop them again — they unlock. Your data stays on your device, and
        only you hold the key. Open source and powered by AES-256 encryption.
      </Typography.Paragraph>

      {capability === 'unsupported' && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message="This browser doesn't support passkeys (WebAuthn)"
          description={
            <>
              FileKey needs a browser with WebAuthn and the PRF extension — Chrome ≥112, Edge
              ≥112, or Safari ≥17. {seeRequirements}
            </>
          }
        />
      )}
      {capability === 'no-platform' && (
        <Alert
          type="info"
          showIcon
          role="alert"
          message="No built-in authenticator detected"
          description={
            <>
              You can still use a hardware security key that supports FIDO2 + PRF (e.g. a YubiKey
              5). {seeRequirements}
            </>
          }
        />
      )}
      {error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={error}
          description={seeRequirements}
        />
      )}

      <Steps
        current={current}
        items={[
          { title: 'Create passkey' },
          { title: 'Authenticate' },
          { title: 'Ready' },
        ]}
      />

      {current === 0 && (
        <Space>
          <Button
            type="primary"
            loading={busy}
            disabled={capability === 'unsupported'}
            onClick={handleCreate}
          >
            Create passkey
          </Button>
          <Button loading={busy} disabled={capability === 'unsupported'} onClick={handleAuthenticate}>
            Already have a FileKey? Authenticate
          </Button>
        </Space>
      )}
      {current === 1 && (
        <Button type="primary" loading={busy} onClick={handleAuthenticate}>
          Authenticate
        </Button>
      )}
      {current === 2 && (
        <Typography.Paragraph>
          You're ready — drop files anywhere to encrypt or decrypt them.
        </Typography.Paragraph>
      )}
    </Space>
  );
}
