import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileList } from './FileList';
import type { FileJob } from '../files/ops';
import * as save from '../files/save';

// jobStatusLabel now pulls FileList through files/ops.ts, whose top-level import of
// crypto/client constructs a real Worker on module load — mock it out like
// files/ops.test.ts already does, since this suite only exercises label rendering.
vi.mock('../crypto/client', () => ({ rpc: { call: vi.fn() } }));

// FileList now renders ShareFileAction (T10) per done row; useSession() throws
// outside a <SessionProvider>, so mock it like ShareFileAction.test.tsx does —
// this suite only asserts the per-row Share control is present, not its flow.
vi.mock('../state/session', () => ({
  useSession: () => ({ locked: false, unlock: vi.fn(), lock: vi.fn(), getSharePubHex: vi.fn() }),
}));

const done = (id: string, over: Partial<FileJob> = {}): FileJob => ({
  id,
  name: 'a.png',
  kind: 'plain',
  status: 'done',
  outName: 'a.png.filekey',
  data: new Uint8Array([1]).buffer,
  ...over,
});

describe('FileList', () => {
  it('shows a status tag per job: Encrypted / Decrypted / Failed', () => {
    render(
      <FileList
        jobs={[
          done('1'),
          done('2', { name: 'b.filekey', kind: 'encrypted', outName: 'b' }),
          { id: '3', name: 'c.filekey', kind: 'encrypted', status: 'error', error: 'wrong passkey/key' },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Encrypted')).toBeInTheDocument();
    expect(within(items[1]).getByText('Decrypted')).toBeInTheDocument();
    expect(within(items[2]).getByText('Failed')).toBeInTheDocument();
    expect(within(items[2]).getByText(/wrong passkey\/key/)).toBeInTheDocument();
  });

  it('shows a spinner and no Save button while processing', () => {
    render(<FileList jobs={[{ id: '1', name: 'a.png', kind: 'plain', status: 'processing' }]} />);
    const item = screen.getByRole('listitem');
    expect(within(item).queryByRole('button', { name: /save/i })).toBeNull();
    expect(within(item).getByText('Processing')).toBeInTheDocument();
  });

  it('Save triggers the download for that job', () => {
    const spy = vi.spyOn(save, 'saveJob').mockImplementation(() => {});
    render(<FileList jobs={[done('1')]} />);
    fireEvent.click(within(screen.getByRole('listitem')).getByRole('button', { name: /^save$/i }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    spy.mockRestore();
  });

  it('shows a totals line and Save all saves every done job sequentially', () => {
    const spy = vi.spyOn(save, 'saveJob').mockImplementation(() => {});
    render(
      <FileList
        jobs={[
          done('1'),
          done('2'),
          { id: '3', name: 'x', kind: 'plain', status: 'error', error: 'encryption failed' },
        ]}
      />,
    );
    expect(screen.getByText(/3 files · 2 done · 1 failed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save all/i }));
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('renders nothing for an empty job list', () => {
    const { container } = render(<FileList jobs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Share as a sibling child of Save per row, not a List.Item actions array (B2)', () => {
    render(<FileList jobs={[done('1'), done('2')]} />);
    const items = screen.getAllByRole('listitem');
    // Exactly one <li> per job — an `actions` array would add an extra <li> per action.
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(within(item).getByRole('button', { name: 'Share' })).toBeInTheDocument();
      expect(within(item).getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    }
  });

  it('omits Share when the job has no cached data (job.data === undefined)', () => {
    render(<FileList jobs={[done('1', { data: undefined })]} />);
    const item = screen.getByRole('listitem');
    expect(within(item).queryByRole('button', { name: 'Share' })).toBeNull();
  });
});
