// Ported from src/js/lib/buffer.js (buffer_helper) and src/js/app/crypto-ops.js:85-91
// (combineArrayBuffers). Logic preserved exactly; constructor wrapper replaced by
// module exports; the buffer_type parameter split into hexToUint8Array/hexToArrayBuffer.

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexStringToHexNumber(hex_str: string): string {
  return /0x/i.test(hex_str.substring(0, 2)) ? hex_str.substring(2) : hex_str;
}

export function hexToUint8Array(hex_str: string): Uint8Array {
  const hex = hexStringToHexNumber(hex_str);
  const ret: number[] = [];
  for (let i = 0; i < hex.length / 2; i++) {
    ret.push(parseInt(hex.substring(i * 2, i * 2 + 2), 16));
  }
  return new Uint8Array(ret);
}

export function hexToArrayBuffer(hex_str: string): ArrayBuffer {
  return hexToUint8Array(hex_str).buffer as ArrayBuffer;
}

export function combineArrayBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
  const combined = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  combined.set(new Uint8Array(buffer1), 0);
  combined.set(new Uint8Array(buffer2), buffer1.byteLength);
  return combined.buffer;
}
