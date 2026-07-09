// The pinned synthetic PRF used by worker + golden tests. MUST stay byte-identical
// to PINNED_PRF in tests/fixtures/generate-fixtures.mjs (duplicated there because
// that script executes the pre-conversion JS without TS tooling).
export function pinnedPrf(): ArrayBuffer {
  const prf = new Uint8Array(64);
  for (let i = 0; i < 64; i++) prf[i] = i;
  return prf.buffer;
}
