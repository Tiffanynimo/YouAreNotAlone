/**
 * E2EE utilities using Web Crypto API (ECDH P-256 + AES-GCM).
 * Private keys are stored in localStorage per user.
 * Encrypted messages are prefixed with "ENC:" so plaintext is still renderable.
 */

const ALGO = { name: "ECDH", namedCurve: "P-256" };

function storageKey(userId) {
  return `yana_pk_${userId}`;
}

/**
 * Initialize crypto for a user.
 * Generates a new ECDH key pair on first call (or loads existing from localStorage).
 * Uploads the public key to the server.
 * Returns { privateKey: CryptoKey, publicKeyB64: string }
 */
export async function initCrypto(userId) {
  const stored = localStorage.getItem(storageKey(userId));

  if (stored) {
    const { privateKeyJwk, publicKeyB64 } = JSON.parse(stored);
    const privateKey = await crypto.subtle.importKey(
      "jwk", privateKeyJwk, ALGO, false, ["deriveKey"]
    );
    // Re-upload in case the server lost it
    await uploadPublicKey(publicKeyB64).catch(() => {});
    return { privateKey, publicKeyB64 };
  }

  // Generate fresh key pair
  const keyPair = await crypto.subtle.generateKey(ALGO, true, ["deriveKey"]);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicKeyJwk  = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const publicKeyB64  = btoa(JSON.stringify(publicKeyJwk));

  localStorage.setItem(storageKey(userId), JSON.stringify({ privateKeyJwk, publicKeyB64 }));
  await uploadPublicKey(publicKeyB64);

  return { privateKey: keyPair.privateKey, publicKeyB64 };
}

/**
 * Upload caller's public key to the server.
 */
export async function uploadPublicKey(publicKeyB64) {
  await fetch("/api/crypto/public-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ publicKey: publicKeyB64 }),
  });
}

/**
 * Derive a shared AES-GCM key via ECDH.
 * @param {CryptoKey} myPrivateKey
 * @param {string} theirPublicKeyB64 — base64-encoded JWK string
 * @returns {CryptoKey} shared AES-GCM key
 */
export async function getSharedKey(myPrivateKey, theirPublicKeyB64) {
  const theirPublicKeyJwk = JSON.parse(atob(theirPublicKeyB64));
  const theirPublicKey = await crypto.subtle.importKey(
    "jwk", theirPublicKeyJwk, ALGO, false, []
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt plaintext with AES-GCM.
 * @returns {string} "ENC:<iv_b64>:<cipher_b64>"
 */
export async function encryptMessage(sharedKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, encoded);

  const ivB64     = btoa(String.fromCharCode(...iv));
  const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `ENC:${ivB64}:${cipherB64}`;
}

/**
 * Decrypt an "ENC:<iv_b64>:<cipher_b64>" string.
 * @returns {string} plaintext
 */
export async function decryptMessage(sharedKey, ciphertext) {
  const [, ivB64, cipherB64] = ciphertext.split(":");
  const iv     = Uint8Array.from(atob(ivB64),     c => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, sharedKey, cipher);
  return new TextDecoder().decode(decrypted);
}
