import { useMemo } from 'react';
import App from '../App';
import { SessionContext, type Session } from '../state/session';
import { ThemeProvider } from '../theme';
import type { FileJob } from '../files/ops';

/**
 * DEV-ONLY UI harness. Renders the real <App/> in an UNLOCKED state without a
 * passkey or the crypto worker, so the authenticated UI (shell, header, file
 * list, Share Center) can be iterated with HMR. It is imported only by
 * dev-preview.html — never by the production entry (index.html → main.tsx) — so
 * it is not part of the shipped bundle.
 */

// 266-hex shape (04 + 132 bytes) so shareLink()/ShareQr render a plausible QR + link.
const FAKE_PUB = '04' + 'ab'.repeat(132);

const mockSession: Session = {
  locked: false,
  unlock: async () => true,
  lock: async () => {},
  getSharePubHex: async () => FAKE_PUB,
};

// One fixture per file-row state so every FileList variant is visible at once.
const sampleJobs: FileJob[] = [
  { id: 'd1', name: 'photo.png', kind: 'plain', status: 'done', outName: 'photo.png.filekey', data: new Uint8Array([1]).buffer },
  { id: 'd2', name: 'report.filekey', kind: 'encrypted', status: 'done', outName: 'report', data: new Uint8Array([1]).buffer },
  { id: 'd3', name: 'note.shared_filekey', kind: 'shared', status: 'done', outName: 'note', data: new Uint8Array([1]).buffer },
  { id: 'p1', name: 'archive.zip', kind: 'plain', status: 'processing' },
  { id: 'e1', name: 'bad.filekey', kind: 'encrypted', status: 'error', error: 'wrong passkey/key' },
];

export function DevPreview() {
  const session = useMemo<Session>(() => mockSession, []);
  // ?jobs=0 renders the empty unlocked home; default shows the sample rows.
  const jobs = new URLSearchParams(location.search).get('jobs') === '0' ? [] : sampleJobs;
  return (
    <ThemeProvider>
      <SessionContext.Provider value={session}>
        <div
          style={{
            position: 'fixed',
            bottom: 8,
            left: 8,
            zIndex: 9999,
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 6,
            background: '#1377F9',
            color: '#fff',
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        >
          DEV PREVIEW · no passkey
        </div>
        <App initialJobs={jobs} />
      </SessionContext.Provider>
    </ThemeProvider>
  );
}
