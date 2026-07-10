import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import { parseShareInput } from './link';

/** Scan is hidden entirely when this is false (design §8.1). */
export async function hasCamera(): Promise<boolean> {
  if (!navigator.mediaDevices?.enumerateDevices) return false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((d) => d.kind === 'videoinput');
  } catch {
    return false;
  }
}

type DetectFn = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>;

/** Native BarcodeDetector where present; lazy zxing-wasm otherwise (D6). */
async function makeDetector(): Promise<DetectFn> {
  if ('BarcodeDetector' in window) {
    type BD = { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> };
    const Ctor = (window as unknown as { BarcodeDetector: new (o: object) => BD })
      .BarcodeDetector;
    const detector = new Ctor({ formats: ['qr_code'] });
    return async (video) => {
      const codes = await detector.detect(video);
      return codes.length > 0 ? codes[0].rawValue : null;
    };
  }

  const [{ prepareZXingModule, readBarcodes }, wasm] = await Promise.all([
    import('zxing-wasm/reader'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? wasm.default : prefix + path,
    },
  });
  return async (video, canvas) => {
    if (video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return null;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const results = await readBarcodes(imageData, { formats: ['QRCode'] });
    return results.length > 0 ? results[0].text : null;
  };
}

export function QrScanner({
  onScan,
  onClose,
}: {
  onScan: (pubHex: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [denied, setDenied] = useState(false);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch {
        if (!cancelled) {
          setDenied(true);
          setStarting(false);
        }
        return;
      }
      if (cancelled || videoRef.current === null) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // jsdom / autoplay restrictions — the poll below still reads frames
      }
      setStarting(false);
      const detect = await makeDetector();
      if (cancelled) return; // unmounted during the (possibly slow) detector load
      let busy = false;
      timer = setInterval(async () => {
        if (busy || cancelled) return;
        busy = true;
        const text = await detect(video, canvasRef.current as HTMLCanvasElement).catch(
          () => null,
        );
        busy = false;
        if (text === null) return;
        const pubHex = parseShareInput(text);
        if (pubHex !== null && !cancelled) {
          if (timer !== null) clearInterval(timer);
          onScan(pubHex);
        }
      }, 300);
    })();

    return () => {
      cancelled = true;
      if (timer !== null) clearInterval(timer);
      if (stream !== null) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  if (denied) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Camera unavailable"
        description="Camera access was denied. Paste the share link or raw key into the field above instead."
        action={
          <Button size="large" onClick={onClose}>
            Close
          </Button>
        }
      />
    );
  }
  return (
    <div>
      {starting && <Spin aria-label="Starting camera" />}
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Camera preview for QR scanning"
        style={{ width: '100%' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <Button size="large" onClick={onClose} style={{ marginTop: 8 }}>
        Cancel
      </Button>
    </div>
  );
}
