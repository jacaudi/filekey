import { useState } from 'react';
import { App, Button, Modal, Result, Select, Space, Spin, Typography } from 'antd';
import { useSession } from '../state/session';
import { listRecipients, type Recipient } from '../files/db';
import type { FileJob } from '../files/ops';
import { truncateKey } from './link';
import { useInboundShare } from './inbound';
import { AddRecipientControl } from './RecipientsPane';
import { encryptForRecipient, sharedFileName } from './shareFile';
import { downloadBlob } from '../files/save';

const NEW_RECIPIENT = '__new__';

type ShareResult = { blob: Blob; filename: string; canShareFile: boolean };

/** Per-file Share action (design §8.2) — picker → shared_ecdh_enc → Share/Save. */
export function ShareFileAction({ job }: { job: FileJob }) {
  const { message } = App.useApp();
  const { locked, unlock } = useSession();
  const inbound = useInboundShare();
  const [open, setOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<string | null>(inbound?.pubHex ?? null);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<ShareResult | null>(null);

  const beginUnlock = () => {
    setAuthFailed(false);
    setUnlocking(true);
    // WebAuthn must fire from the user gesture (design §5.2)
    unlock()
      .then((ok) => {
        setUnlocking(false);
        if (!ok) setAuthFailed(true);
      })
      .catch(() => {
        // worker key-derivation rejection (prf_to_key/set_seed) is not caught
        // by session.unlock() — route into the same inline retry as a failed
        // unlock so the spinner never gets stuck (§9, no dead-end).
        setUnlocking(false);
        setAuthFailed(true);
      });
  };

  const openShare = () => {
    setResult(null);
    setAuthFailed(false);
    setSelected(inbound?.pubHex ?? null);
    setOpen(true);
    listRecipients().then(setRecipients);
    if (locked) beginUnlock();
  };

  const encrypt = async () => {
    if (selected === null || selected === NEW_RECIPIENT || job.data === undefined) return;
    setWorking(true);
    try {
      const out = await encryptForRecipient(job.data, selected);
      const filename = sharedFileName(job);
      const blob = new Blob([out], { type: 'application/octet-stream' });
      const probe = new File([blob], filename, { type: 'application/octet-stream' });
      const canShareFile = navigator.canShare?.({ files: [probe] }) === true;
      setResult({ blob, filename, canShareFile });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Sharing failed');
    } finally {
      setWorking(false);
    }
  };

  const shareOut = async () => {
    if (result === null) return;
    const file = new File([result.blob], result.filename, {
      type: 'application/octet-stream',
    });
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      // user-dismissed share sheet is not an error (§9)
      if ((e as DOMException).name !== 'AbortError') {
        message.error('Could not open the share sheet');
      }
    }
  };

  const options = [
    ...(inbound !== null && recipients.every((r) => r.pubHex !== inbound.pubHex)
      ? [
          {
            value: inbound.pubHex,
            title: `From link (${truncateKey(inbound.pubHex)})`,
            label: `From link (${truncateKey(inbound.pubHex)})`,
          },
        ]
      : []),
    ...recipients.map((r) => ({
      value: r.pubHex,
      title: `${r.name} (${truncateKey(r.pubHex)})`,
      label: `${r.name} (${truncateKey(r.pubHex)})`,
    })),
    { value: NEW_RECIPIENT, title: 'New recipient…', label: 'New recipient…' },
  ];

  let body: JSX.Element;
  if (authFailed) {
    // §9: inline retry — never a dead-end
    body = (
      <Result
        status="warning"
        title="Passkey authentication failed"
        subTitle="Sharing needs your passkey."
        extra={
          <Button type="primary" size="large" onClick={beginUnlock}>
            Try again
          </Button>
        }
      />
    );
  } else if (locked || unlocking) {
    body = (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" aria-label="Waiting for passkey" />
      </div>
    );
  } else if (result !== null) {
    body = (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text>{result.filename}</Typography.Text>
        <Space wrap>
          {result.canShareFile && (
            // share-first ordering where file share is available (D6)
            <Button type="primary" size="large" onClick={shareOut}>
              Share file
            </Button>
          )}
          <Button
            type={result.canShareFile ? 'default' : 'primary'}
            size="large"
            onClick={() => downloadBlob(result.blob, result.filename)}
          >
            Save
          </Button>
        </Space>
      </Space>
    );
  } else {
    body = (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Select
          aria-label="Recipient"
          size="large"
          style={{ width: '100%' }}
          placeholder="Choose a recipient"
          value={selected}
          options={options}
          onChange={setSelected}
        />
        {selected === NEW_RECIPIENT && (
          <AddRecipientControl
            activePubHex={inbound?.pubHex ?? null}
            onAdded={(r) => {
              setRecipients((prev) => [...prev, r]);
              setSelected(r.pubHex);
            }}
          />
        )}
        <Button
          type="primary"
          size="large"
          loading={working}
          disabled={selected === null || selected === NEW_RECIPIENT}
          onClick={encrypt}
        >
          Encrypt for recipient
        </Button>
      </Space>
    );
  }

  return (
    <>
      <Button size="large" onClick={openShare}>
        Share
      </Button>
      <Modal
        title={`Share ${job.outName ?? job.name}`}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
      >
        {body}
      </Modal>
    </>
  );
}
