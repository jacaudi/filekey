import { createContext, useContext, useState } from 'react';
import { Alert, Button, Input, Modal, Space } from 'antd';
import { addRecipient, listRecipients } from '../files/db';
import { parseShareInput, truncateKey } from './link';
import { validateRecipientKey } from './validate';

export type InboundShare = { pubHex: string; recipientName: string | null };

/** Inbound ?pub= key, available to the Share Center (validation restore
 *  target) and the per-file picker (default recipient) app-wide. */
export const InboundShareContext = createContext<InboundShare | null>(null);

export function useInboundShare(): InboundShare | null {
  return useContext(InboundShareContext);
}

/**
 * Resolves the ?pub= deep link on app load (legacy pre-attach semantics,
 * design §14): validates and leaves the key set as the worker's shared pub.
 * Returns null when no pub param, 'invalid' on parse/validation failure.
 */
export async function resolveInboundShare(
  search: string,
): Promise<InboundShare | 'invalid' | null> {
  const pub = new URLSearchParams(search).get('pub');
  if (pub === null) return null;
  const pubHex = parseShareInput(pub);
  if (pubHex === null) return 'invalid';
  // activePubHex = null: the inbound key IS becoming the active key — no restore.
  const ok = await validateRecipientKey(pubHex, null);
  if (!ok) return 'invalid';
  const recipients = await listRecipients();
  const match = recipients.find((r) => r.pubHex === pubHex);
  return { pubHex, recipientName: match?.name ?? null };
}

export function InboundShareBanner({
  share,
  onSaved,
  onDismiss,
}: {
  share: InboundShare;
  onSaved: (name: string) => void;
  onDismiss: () => void;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const label = share.recipientName ?? truncateKey(share.pubHex);

  const save = async () => {
    const recipient = await addRecipient(name.trim(), share.pubHex);
    setSaveOpen(false);
    onSaved(recipient.name);
  };

  return (
    <>
      <Alert
        type="info"
        showIcon
        message={`Sharing to ${label}`}
        action={
          <Space>
            {share.recipientName === null && (
              <Button size="small" type="primary" onClick={() => setSaveOpen(true)}>
                Save as recipient
              </Button>
            )}
            <Button size="small" onClick={onDismiss}>
              Dismiss
            </Button>
          </Space>
        }
      />
      <Modal
        title="Save recipient"
        open={saveOpen}
        okText="Save"
        okButtonProps={{ disabled: name.trim() === '' }}
        onOk={save}
        onCancel={() => setSaveOpen(false)}
      >
        <Input
          size="large"
          aria-label="Recipient name"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Modal>
    </>
  );
}
