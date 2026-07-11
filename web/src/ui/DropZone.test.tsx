import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DropZone } from './DropZone';

describe('DropZone', () => {
  it('emits files picked via the hidden input (click path)', async () => {
    const onFiles = vi.fn();
    render(<DropZone onFiles={onFiles} />);
    const input = document.querySelector('input[type="file"]')!;
    const file = new File([new Uint8Array([1])], 'pick.txt');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1));
    expect(onFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual(['pick.txt']);
  });

  it('emits files pasted from the clipboard', async () => {
    const onFiles = vi.fn();
    render(<DropZone onFiles={onFiles} />);
    const file = new File([new Uint8Array([1])], 'shot.png');
    const evt = new Event('paste', { bubbles: true }) as Event & {
      clipboardData: { files: File[] };
    };
    evt.clipboardData = { files: [file] };

    document.dispatchEvent(evt);

    await waitFor(() => expect(onFiles).toHaveBeenCalledWith([file]));
  });

  it('handles drops through collectFiles on the capture phase', async () => {
    const onFiles = vi.fn();
    render(<DropZone onFiles={onFiles} />);
    const zone = screen.getByTestId('fk-dropzone');
    const file = new File([new Uint8Array([1])], 'dropped.txt');

    fireEvent.drop(zone, { dataTransfer: { items: undefined, files: [file] } });

    await waitFor(() => expect(onFiles).toHaveBeenCalledWith([file]));
  });

  it('shows guidance copy that still names the .filekey formats', () => {
    render(<DropZone onFiles={vi.fn()} />);
    expect(screen.getByText(/drop files anywhere to lock or unlock them/i)).toBeInTheDocument();
    expect(screen.getByText(/\.filekey and \.shared_filekey files are decrypted/i)).toBeInTheDocument();
  });
});
