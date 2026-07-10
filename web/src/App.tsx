import { Alert, Layout } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { rpc } from './crypto/client';
import { hexToArrayBuffer } from './crypto/buffer';
import { clearJobs as clearJobCache, requestPersistence, saveJob } from './files/db';
import { jobStatusLabel, processFiles, type FileJob } from './files/ops';
import { StatusAnnouncer } from './a11y/StatusAnnouncer';
import { AppHeader } from './ui/AppHeader';
import { DOCS, type DocKey } from './ui/content';
import { DropZone } from './ui/DropZone';
import { FileList } from './ui/FileList';
import { InfoModal } from './ui/InfoModal';
import { Onboarding } from './ui/Onboarding';
import { UpdatePrompt } from './pwa/UpdatePrompt';
import { useSession } from './state/session';

const PUB_RE = /^04[0-9a-fA-F]{264}$/;

const DOC_TITLES: Record<DocKey, string> = {
  howItWorks: 'How FileKey Works',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

function appVersion(): string {
  return document.querySelector('meta[name="app-version"]')?.getAttribute('content') ?? 'dev';
}

export default function App() {
  const { locked, unlock, lock } = useSession();
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [openDoc, setOpenDoc] = useState<DocKey | null>(null);
  const [attachedPub, setAttachedPub] = useState<string | null>(null);

  // First successful unlock completes onboarding for this session.
  useEffect(() => {
    if (!locked) setReady(true);
  }, [locked]);

  // Session cache is transient — cleared on every app init, like today. Also request
  // persistent storage once (parity with the old app's navigator.storage.persist());
  // fire-and-forget — the IndexedDB cache still works if denied, so only warn.
  useEffect(() => {
    void clearJobCache();
    void requestPersistence().then((ok) => {
      if (!ok) console.warn('persistent storage not granted');
    });
  }, []);

  // ?pub= parity (design §2.2/§9): validate, attach, minimal notice. Full banner
  // UX (saved-recipient matching, save-as-recipient) is Phase 4.
  useEffect(() => {
    const pub = new URLSearchParams(window.location.search).get('pub');
    if (!pub || !PUB_RE.test(pub)) return;
    const pub_buff = hexToArrayBuffer(pub);
    rpc
      .call('set_shared_pub', { pub_buff }, [pub_buff])
      .then(() => setAttachedPub(pub))
      .catch(() => setAttachedPub(null));
  }, []);

  const onJob = useCallback((job: FileJob) => {
    setJobs((prev) => {
      const i = prev.findIndex((j) => j.id === job.id);
      if (i === -1) return [...prev, job];
      const next = prev.slice();
      next[i] = job;
      return next;
    });
    if (job.status === 'done') void saveJob(job);
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      // Gated action (design §5.2): the passkey prompt fires directly from the
      // user gesture when locked — no intermediate screen.
      if (locked && !(await unlock())) return;
      await processFiles(files, onJob);
    },
    [locked, unlock, onJob],
  );

  const handleReset = useCallback(async () => {
    // Nuclear option (design §5.4): wipe session + file cache, replay onboarding.
    // Phase 4 adds the saved-recipients wipe here.
    await clearJobCache();
    await lock();
    setJobs([]);
    setAttachedPub(null);
    setReady(false);
  }, [lock]);

  const version = useMemo(appVersion, []);

  return (
    <Layout style={{ minHeight: '100dvh' }}>
      <UpdatePrompt />
      <StatusAnnouncer
        jobs={jobs.map((j) => ({ id: j.id, name: j.name, status: jobStatusLabel(j) }))}
      />
      <AppHeader
        locked={locked}
        onLock={() => void lock()}
        onReset={() => void handleReset()}
        onOpenDoc={setOpenDoc}
        version={version}
      />
      {attachedPub && (
        <Alert
          type="info"
          showIcon
          closable
          role="alert"
          style={{ margin: '0 16px' }}
          message={`Share key attached: ${attachedPub.slice(0, 4)}…${attachedPub.slice(-4)}`}
          description="This recipient key is set for this session."
          onClose={() => setAttachedPub(null)}
        />
      )}
      <Layout.Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: 16,
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
        }}
      >
        {!ready ? (
          <Onboarding onOpenDoc={setOpenDoc} />
        ) : (
          <>
            <FileList jobs={jobs} />
            <DropZone onFiles={(files) => void handleFiles(files)} />
          </>
        )}
      </Layout.Content>
      <InfoModal
        title={openDoc ? DOC_TITLES[openDoc] : ''}
        markdown={openDoc ? DOCS[openDoc] : ''}
        open={openDoc !== null}
        onClose={() => setOpenDoc(null)}
      />
    </Layout>
  );
}
