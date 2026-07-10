import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { hasCamera, QrScanner } from './QrScanner';

const VALID_HEX = '04' + 'a1b2'.repeat(66);
const DEEP_LINK = `https://filekey.example/?pub=${VALID_HEX.toUpperCase()}`;

function fakeStream() {
  const stop = vi.fn();
  return { stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, stop };
}

function installMediaDevices(overrides: Partial<MediaDevices>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: overrides,
    configurable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as Record<string, unknown>).BarcodeDetector;
});

describe('hasCamera', () => {
  it('is true when a videoinput device exists', async () => {
    installMediaDevices({
      enumerateDevices: vi.fn().mockResolvedValue([
        { kind: 'audioinput' },
        { kind: 'videoinput' },
      ]),
    } as unknown as MediaDevices);
    expect(await hasCamera()).toBe(true);
  });

  it('is false without videoinput, without mediaDevices, or on failure', async () => {
    installMediaDevices({
      enumerateDevices: vi.fn().mockResolvedValue([{ kind: 'audioinput' }]),
    } as unknown as MediaDevices);
    expect(await hasCamera()).toBe(false);

    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    expect(await hasCamera()).toBe(false);

    installMediaDevices({
      enumerateDevices: vi.fn().mockRejectedValue(new Error('nope')),
    } as unknown as MediaDevices);
    expect(await hasCamera()).toBe(false);
  });
});

describe('QrScanner', () => {
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const { stream } = fakeStream();
    getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices({ getUserMedia } as unknown as MediaDevices);
    // jsdom has no HTMLMediaElement.play
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
    });
  });

  it('uses BarcodeDetector when native and reports the parsed hex', async () => {
    class FakeBarcodeDetector {
      static lastOpts: unknown;
      constructor(opts: unknown) {
        FakeBarcodeDetector.lastOpts = opts;
      }
      async detect() {
        return [{ rawValue: DEEP_LINK }];
      }
    }
    (window as unknown as Record<string, unknown>).BarcodeDetector = FakeBarcodeDetector;

    const onScan = vi.fn();
    render(<QrScanner onScan={onScan} onClose={vi.fn()} />);

    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
    await waitFor(() => expect(onScan).toHaveBeenCalledWith(VALID_HEX.toLowerCase()), {
      timeout: 2000,
    });
    expect(FakeBarcodeDetector.lastOpts).toEqual({ formats: ['qr_code'] });
  });

  it('ignores scanned text that is not a share key or link', async () => {
    class NoiseDetector {
      async detect() {
        return [{ rawValue: 'https://example.com/not-a-key' }];
      }
    }
    (window as unknown as Record<string, unknown>).BarcodeDetector = NoiseDetector;

    const onScan = vi.fn();
    render(<QrScanner onScan={onScan} onClose={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 700)); // > 2 poll ticks
    expect(onScan).not.toHaveBeenCalled();
  });

  it('shows the paste-field hint when camera permission is denied', async () => {
    getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    render(<QrScanner onScan={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText('Camera unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/paste the share link or raw key into the field above/i),
    ).toBeInTheDocument();
  });

  it('stops camera tracks on unmount', async () => {
    const { stream, stop } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    class IdleDetector {
      async detect() {
        return [];
      }
    }
    (window as unknown as Record<string, unknown>).BarcodeDetector = IdleDetector;

    const { unmount } = render(<QrScanner onScan={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(stop).toHaveBeenCalled());
  });

  it('falls back to zxing-wasm when BarcodeDetector is absent and reports the parsed hex', async () => {
    vi.doMock('zxing-wasm/reader', () => ({
      prepareZXingModule: vi.fn(),
      readBarcodes: vi.fn().mockResolvedValue([{ text: DEEP_LINK }]),
    }));
    vi.doMock('zxing-wasm/reader/zxing_reader.wasm?url', () => ({ default: 'test.wasm' }));

    // No BarcodeDetector on window -> makeDetector() takes the zxing-wasm branch.
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      value: 320,
      configurable: true,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      value: 240,
      configurable: true,
    });
    const getImageData = vi.fn().mockReturnValue({} as ImageData);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      getImageData,
    } as unknown as CanvasRenderingContext2D);

    const onScan = vi.fn();
    render(<QrScanner onScan={onScan} onClose={vi.fn()} />);

    await waitFor(() => expect(onScan).toHaveBeenCalledWith(VALID_HEX.toLowerCase()), {
      timeout: 2000,
    });
  });

  it('does not start the scan loop when unmounted while the zxing-wasm detector is still loading', async () => {
    // Force a fresh dynamic import so this test's deferred mock is used, not the
    // instant-resolving mock cached by the fallback test above.
    vi.resetModules();
    let releaseImport: () => void = () => {};
    const importGate = new Promise<void>((resolve) => {
      releaseImport = resolve;
    });
    let factoryInvoked = false;
    const readBarcodes = vi.fn().mockResolvedValue([{ text: DEEP_LINK }]);
    vi.doMock('zxing-wasm/reader', async () => {
      factoryInvoked = true;
      await importGate; // detector load stays pending until we release it
      return { prepareZXingModule: vi.fn(), readBarcodes };
    });
    vi.doMock('zxing-wasm/reader/zxing_reader.wasm?url', () => ({ default: 'test.wasm' }));

    // The component's only setInterval is the 300ms poll — a precise signal for
    // "a scan loop was started". The bug creates it AFTER cleanup ran.
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const onScan = vi.fn();
    const { unmount } = render(<QrScanner onScan={onScan} onClose={vi.fn()} />);

    // makeDetector() has begun the dynamic import and is now awaiting it.
    await waitFor(() => expect(factoryInvoked).toBe(true));

    // Unmount while the import is still pending: cleanup runs, timer is still null.
    unmount();

    // Resolve the import; the resumed async effect must short-circuit on `cancelled`.
    releaseImport();
    await importGate;
    await new Promise((r) => setTimeout(r, 50)); // flush the post-import microtask chain

    // No poll interval may be created after cleanup, and no scanning may occur.
    expect(setIntervalSpy).not.toHaveBeenCalledWith(expect.any(Function), 300);
    expect(readBarcodes).not.toHaveBeenCalled();
    expect(onScan).not.toHaveBeenCalled();
  });
});
