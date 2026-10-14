/** Unsigned JWT with the given payload (enough for client-side expiry checks). */
export function fakeJwt(payload: object): string {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `header.${encoded}.signature`;
}
