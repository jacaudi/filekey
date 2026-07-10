import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const toCanvas = vi.fn();
vi.mock('qrcode', () => ({ default: { toCanvas: (...args: unknown[]) => toCanvas(...args) } }));

import { ShareQr } from './ShareQr';

const LINK = `https://filekey.example/?pub=${'04' + 'a1b2'.repeat(66)}`;

beforeEach(() => {
  toCanvas.mockReset();
  toCanvas.mockResolvedValue(undefined);
});

describe('ShareQr', () => {
  it('renders an accessible canvas and draws the deep link into it', async () => {
    render(<ShareQr link={LINK} />);
    const canvas = screen.getByRole('img', { name: 'QR code of your FileKey share link' });
    await waitFor(() => expect(toCanvas).toHaveBeenCalledTimes(1));
    const [canvasArg, text, opts] = toCanvas.mock.calls[0] as [
      HTMLCanvasElement,
      string,
      { width: number },
    ];
    expect(canvasArg).toBe(canvas);
    expect(text).toBe(LINK); // the DEEP LINK, never raw hex
    expect(opts.width).toBe(Math.min(320, Math.floor(window.innerWidth * 0.8)));
  });

  it('falls back to the copyable link text when rendering fails', async () => {
    toCanvas.mockRejectedValueOnce(new Error('no canvas 2d'));
    render(<ShareQr link={LINK} />);
    expect(await screen.findByText(LINK)).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'QR code of your FileKey share link' }),
    ).not.toBeInTheDocument();
  });
});
