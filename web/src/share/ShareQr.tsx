import { useEffect, useRef, useState } from 'react';
import { Typography } from 'antd';
import QRCode from 'qrcode';

/**
 * QR of the ?pub= deep link (D2) — the primary desktop→phone handoff.
 * The accessible label + the copyable link fallback are the §9 non-visual
 * equivalents.
 */
export function ShareQr({ link }: { link: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [size] = useState(() => Math.min(320, Math.floor(window.innerWidth * 0.8)));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    let stale = false;
    QRCode.toCanvas(canvas, link, { width: size, margin: 2, errorCorrectionLevel: 'M' }).catch(
      () => {
        if (!stale) setFailed(true);
      },
    );
    return () => {
      stale = true;
    };
  }, [link, size]);

  if (failed) {
    return (
      <Typography.Text copyable style={{ wordBreak: 'break-all' }}>
        {link}
      </Typography.Text>
    );
  }
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="QR code of your FileKey share link"
      style={{ width: size, height: size }}
    />
  );
}
