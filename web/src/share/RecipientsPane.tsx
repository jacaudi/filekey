import { useCallback, useEffect, useState } from 'react';
import { App, Button, Empty, Input, List, Modal, Popconfirm, Space, Typography } from 'antd';
import {
  addRecipient,
  deleteRecipient,
  listRecipients,
  renameRecipient,
  type Recipient,
} from '../files/db';
import { parseShareInput, truncateKey } from './link';
import { validateRecipientKey } from './validate';
import { hasCamera, QrScanner } from './QrScanner';

/**
 * Validated add control — also reused inline by the per-file recipient picker
 * (design §8.2). Accepts raw 266-hex or a pasted/scanned deep link.
 */
export function AddRecipientControl({
  activePubHex,
  onAdded,
}: {
  activePubHex: string | null;
  onAdded: (r: Recipient) => void;
}) {
  const { message } = App.useApp();
  const [value, setValue] = useState('');
  const [name, setName] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hasCamera().then(setCameraAvailable);
  }, []);

  const parsedHex = parseShareInput(value);
  const invalid = value.trim() !== '' && parsedHex === null;

  const handleScan = useCallback((hex: string) => {
    setValue(hex);
    setScanOpen(false);
  }, []);

  const add = async () => {
    if (parsedHex === null) return;
    setSaving(true);
    try {
      const valid = await validateRecipientKey(parsedHex, activePubHex);
      if (!valid) {
        message.error('That is not a valid FileKey Share Key');
        return;
      }
      const recipient = await addRecipient(name.trim() || truncateKey(parsedHex), parsedHex);
      setValue('');
      setName('');
      message.success('Recipient saved');
      onAdded(recipient);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Input
        size="large"
        aria-label="Share key or link"
        placeholder="Paste a share link or raw key"
        value={value}
        status={invalid ? 'error' : undefined}
        onChange={(e) => setValue(e.target.value)}
      />
      {invalid && (
        <Typography.Text type="danger">Not a valid Share Key or link</Typography.Text>
      )}
      <Input
        size="large"
        aria-label="Recipient name"
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Space wrap>
        <Button
          type="primary"
          size="large"
          disabled={parsedHex === null}
          loading={saving}
          onClick={add}
        >
          Add
        </Button>
        {cameraAvailable && !scanOpen && (
          <Button size="large" onClick={() => setScanOpen(true)}>
            Scan QR
          </Button>
        )}
      </Space>
      {scanOpen && <QrScanner onScan={handleScan} onClose={() => setScanOpen(false)} />}
    </Space>
  );
}

export function RecipientsPane({ activePubHex }: { activePubHex: string | null }) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [renaming, setRenaming] = useState<Recipient | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const refresh = useCallback(() => {
    listRecipients().then(setRecipients);
  }, []);

  useEffect(refresh, [refresh]);

  const confirmRename = async () => {
    if (renaming === null) return;
    await renameRecipient(renaming.id, renameValue.trim());
    setRenaming(null);
    refresh();
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Recipients
        </Typography.Title>
        <Typography.Text type="secondary">Stored only on this device.</Typography.Text>
      </div>
      <AddRecipientControl activePubHex={activePubHex} onAdded={refresh} />
      <List
        dataSource={recipients}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No saved recipients yet."
            />
          ),
        }}
        renderItem={(r) => (
          <List.Item
            actions={[
              <Button
                key="rename"
                size="large"
                onClick={() => {
                  setRenaming(r);
                  setRenameValue(r.name);
                }}
              >
                Rename
              </Button>,
              <Popconfirm
                key="delete"
                title={`Delete ${r.name}?`}
                okText="Yes"
                onConfirm={async () => {
                  await deleteRecipient(r.id);
                  refresh();
                }}
              >
                <Button size="large" danger>
                  Delete
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={r.name}
              description={
                <Typography.Text type="secondary" style={{ fontFamily: 'monospace' }}>
                  {truncateKey(r.pubHex)}
                </Typography.Text>
              }
            />
          </List.Item>
        )}
      />
      <Modal
        title="Rename recipient"
        open={renaming !== null}
        okText="Save"
        okButtonProps={{ disabled: renameValue.trim() === '' }}
        onOk={confirmRename}
        onCancel={() => setRenaming(null)}
      >
        <Input
          size="large"
          aria-label="Recipient name"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
        />
      </Modal>
    </Space>
  );
}
