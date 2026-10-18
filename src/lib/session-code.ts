/** Génère un code de session aléatoire de 8 chiffres (cryptographiquement sûr). */
export function generateSessionCode(): string {
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => String(n % 10)).join("");
}

export function isValidSessionCode(value: string): boolean {
  return /^[0-9]{8}$/.test(value);
}

/** Affiche « 1234 5678 ». */
export function formatSessionCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

export function normalizeCodeInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}
