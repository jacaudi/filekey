import { App as AntApp, Layout } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearJobs as clearJobCache,
  clearRecipients,
  requestPersistence,
  saveJob,
} from './files/db';
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
import {
  InboundShareBanner,
  InboundShareContext,
  resolveInboundShare,
  type InboundShare,
} from './share/inbound';

const DOC_TITLES: Record<DocKey, string> = {
  howItWorks: 'How FileKey Works',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

function appVersion(): string {
  return document.querySelector('meta[name="app-version"]')?.getAttribute('content') ?? 'dev';
}

// `initialJobs` is an optional seam for tests and the DEV-only UI preview harness to
// render the file list with fixtures. Production (`main.tsx`) renders <App/> with none.
export default function App({ initialJobs = [] }: { initialJobs?: FileJob[] } = {}) {
  const { message } = AntApp.useApp();
  const { locked, unlock, lock } = useSession();
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<FileJob[]>(initialJobs);
  const [openDoc, setOpenDoc] = useState<DocKey | null>(null);
  const [inbound, setInbound] = useState<InboundShare | null>(null);

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

  // Inbound ?pub= deep link (design §8.3/§14): validate, resolve saved-recipient
  // name, offer save-as-recipient. Leaves the key attached in the worker.
  useEffect(() => {
    resolveInboundShare(location.search).then((result) => {
      if (result === 'invalid') {
        message.error('Invalid share link');
      } else if (result !== null) {
        setInbound(result);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Nuclear option (design §5.4): wipe session + file cache + saved recipients,
    // replay onboarding. Lock (header onLock) intentionally does not touch recipients.
    await Promise.all([clearJobCache(), clearRecipients()]);
    await lock();
    setJobs([]);
    setInbound(null);
    setReady(false);
  }, [lock]);

  const version = useMemo(appVersion, []);

  return (
    <InboundShareContext.Provider value={inbound}>
      {inbound !== null && (
        <InboundShareBanner
          share={inbound}
          onSaved={(name) => setInbound({ ...inbound, recipientName: name })}
          onDismiss={() => setInbound(null)}
        />
      )}
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
        <Layout.Content
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            paddingLeft: 'max(16px, env(safe-area-inset-left))',
            paddingRight: 'max(16px, env(safe-area-inset-right))',
          }}
        >
          <div
            data-testid="fk-content"
            style={{
              width: '100%',
              maxWidth: 760,
              margin: '0 auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
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
          </div>
        </Layout.Content>
        <InfoModal
          title={openDoc ? DOC_TITLES[openDoc] : ''}
          markdown={openDoc ? DOCS[openDoc] : ''}
          open={openDoc !== null}
          onClose={() => setOpenDoc(null)}
        />
      </Layout>
    </InboundShareContext.Provider>
  );
}
