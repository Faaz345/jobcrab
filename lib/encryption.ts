import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Get the encryption key from environment.
 * Must be a 32-byte hex string (64 hex characters).
 */
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set");
  }
  // If the key is shorter than 64 hex chars, pad by hashing it
  // In production, use a proper 32-byte random key
  const keyBuffer = Buffer.from(secret.padEnd(32, "0").slice(0, 32), "utf-8");
  return keyBuffer;
}

/**
 * Encrypt a string using AES-256-GCM.
 * Returns a base64-encoded string containing: IV + encrypted data + auth tag
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Combine: IV (16 bytes) + tag (16 bytes) + ciphertext
  const combined = Buffer.concat([
    iv,
    tag,
    Buffer.from(encrypted, "hex"),
  ]);

  return combined.toString("base64");
}

/**
 * Decrypt a base64-encoded AES-256-GCM encrypted string.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getKey();
  const combined = Buffer.from(encryptedBase64, "base64");

  // Extract: IV (16 bytes) + tag (16 bytes) + ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Encrypt a JSON-serializable object.
 */
export function encryptJson<T>(data: T): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt and parse a JSON-serializable object.
 */
export function decryptJson<T>(encryptedBase64: string): T {
  return JSON.parse(decrypt(encryptedBase64)) as T;
}
