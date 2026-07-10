import { useEffect, useState } from 'react';
import {
  App,
  Button,
  Collapse,
  Drawer,
  Flex,
  Grid,
  Modal,
  Result,
  Segmented,
  Space,
  Spin,
  Typography,
} from 'antd';
import { useSession } from '../state/session';
import { useInboundShare } from './inbound';
import { shareLink } from './link';
import { RecipientsPane } from './RecipientsPane';
import { ShareQr } from './ShareQr';

const SHARE_TITLE = 'FileKey';
const SHARE_TEXT = 'Send me encrypted files with FileKey';

/** Header action (D3). Owns open/unlock state; WebAuthn fires from the click. */
export function MyShareKeyButton() {
  const inbound = useInboundShare();
  const activePubHex = inbound?.pubHex ?? null;
  const { locked, unlock } = useSession();
  const [open, setOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  const beginUnlock = () => {
    setAuthFailed(false);
    setUnlocking(true);
    // unlock() must be invoked synchronously inside the user gesture —
    // WebAuthn requires user activation (design §5.2).
    unlock().then((ok) => {
      setUnlocking(false);
      if (!ok) setAuthFailed(true);
    });
  };

  const openCenter = () => {
    setAuthFailed(false);
    setOpen(true);
    if (locked) beginUnlock();
  };

  return (
    <>
      <Button size="large" onClick={openCenter}>
        My Share Key
      </Button>
      <ShareCenter
        open={open}
        unlocking={unlocking}
        authFailed={authFailed}
        activePubHex={activePubHex}
        onRetry={beginUnlock}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

type ShareCenterProps = {
  open: boolean;
  unlocking: boolean;
  authFailed: boolean;
  activePubHex: string | null;
  onRetry: () => void;
  onClose: () => void;
};

/** Bottom Drawer on mobile, Modal on desktop — same children (§8.1). */
export function ShareCenter({
  open,
  unlocking,
  authFailed,
  activePubHex,
  onRetry,
  onClose,
}: ShareCenterProps) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { locked, getSharePubHex } = useSession();
  const [pubHex, setPubHex] = useState<string | null>(null);

  useEffect(() => {
    if (open && !locked) {
      getSharePubHex().then(setPubHex);
    }
    if (!open) setPubHex(null);
  }, [open, locked, getSharePubHex]);

  let body: JSX.Element;
  if (authFailed) {
    body = (
      <Result
        status="warning"
        title="Passkey authentication failed"
        subTitle="Your Share Key stays locked until you authenticate."
        extra={
          <Space direction="vertical" size="middle">
            <Button type="primary" size="large" onClick={onRetry}>
              Try again
            </Button>
            <Typography.Paragraph type="secondary">
              FileKey requirements: a device passkey (Face ID, Touch ID, Windows Hello, or
              Android screen lock) with PRF support — iOS 17+, Android 14+, or a current
              Chrome, Edge, or Safari.
            </Typography.Paragraph>
          </Space>
        }
      />
    );
  } else if (locked || unlocking || pubHex === null) {
    body = (
      <div style={{ textAlign: 'center', padding: 48 }} aria-label="Waiting for passkey">
        <Spin size="large" />
      </div>
    );
  } else {
    body = <ShareCenterBody pubHex={pubHex} activePubHex={activePubHex} />;
  }

  if (isMobile) {
    return (
      <Drawer
        title="My Share Key"
        placement="bottom"
        height="85dvh"
        open={open}
        onClose={onClose}
      >
        {body}
      </Drawer>
    );
  }
  return (
    <Modal title="My Share Key" open={open} onCancel={onClose} footer={null} width={720}>
      {body}
    </Modal>
  );
}

function ShareCenterBody({
  pubHex,
  activePubHex,
}: {
  pubHex: string;
  activePubHex: string | null;
}) {
  const [pane, setPane] = useState<'My Key' | 'Recipients'>('My Key');
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Segmented
        block
        size="large"
        options={['My Key', 'Recipients']}
        value={pane}
        onChange={(v) => setPane(v as 'My Key' | 'Recipients')}
      />
      {pane === 'My Key' ? (
        <MyKeyPane pubHex={pubHex} />
      ) : (
        <RecipientsPane activePubHex={activePubHex} />
      )}
    </Space>
  );
}

function MyKeyPane({ pubHex }: { pubHex: string }) {
  const { message } = App.useApp();
  const link = shareLink(pubHex);
  const canWebShare = typeof navigator.share === 'function';

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    message.success('Copied');
  };
  const copyRawKey = async () => {
    await navigator.clipboard.writeText(pubHex);
    message.success('Copied');
  };
  const shareViaSheet = async () => {
    try {
      await navigator.share({ url: link, title: SHARE_TITLE, text: SHARE_TEXT });
    } catch (e) {
      // user-dismissed share sheet is not an error (§9)
      if ((e as DOMException).name !== 'AbortError') {
        message.error('Could not open the share sheet');
      }
    }
  };

  return (
    // Two-column on the 720px desktop Modal (QR beside the actions, sized for
    // scanning a monitor — §8.1); the narrow mobile Drawer wraps this into a
    // single column. Actions come first in DOM order for a logical tab order.
    <Flex wrap gap="large" align="flex-start">
      <Space direction="vertical" size="large" style={{ flex: 1, minWidth: 260 }}>
        <Space wrap>
          {canWebShare ? (
            <>
              <Button type="primary" size="large" onClick={shareViaSheet}>
                Share my link
              </Button>
              <Button size="large" onClick={copyLink}>
                Copy link
              </Button>
            </>
          ) : (
            // copy-first ordering when Web Share is absent (D6, §8.1)
            <Button type="primary" size="large" onClick={copyLink}>
              Copy link
            </Button>
          )}
        </Space>
        <Collapse
          ghost
          items={[
            {
              key: 'raw',
              label: 'Raw key',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Typography.Text
                    style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}
                  >
                    {pubHex}
                  </Typography.Text>
                  <Button size="large" onClick={copyRawKey}>
                    Copy raw key
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Space>
      <ShareQr link={link} />
    </Flex>
  );
}
