import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileList } from './FileList';
import type { FileJob } from '../files/ops';
import * as save from '../files/save';

// jobStatusLabel now pulls FileList through files/ops.ts, whose top-level import of
// crypto/client constructs a real Worker on module load — mock it out like
// files/ops.test.ts already does, since this suite only exercises label rendering.
vi.mock('../crypto/client', () => ({ rpc: { call: vi.fn() } }));

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
});
