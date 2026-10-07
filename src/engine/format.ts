/* Zahlen im deutschen Format: Komma als Dezimaltrenner, passende Einheit. */
export const de = (s) => String(s).replace(".", ",");
export const fmtA = (i) => {
  const a = Math.abs(i);
  return a >= 1
    ? `${de(a.toFixed(2))} A`
    : `${a < 0.0005 ? "0" : de((a * 1000).toFixed(a >= 0.01 ? 0 : 1))} mA`;
};
export const fmtV = (v) => `${de(Math.abs(v).toFixed(2))} V`;
export const fmtR = (r) =>
  r >= 1000 ? `${de((r / 1000).toFixed(r % 1000 ? 1 : 0))} kΩ` : `${r} Ω`;
