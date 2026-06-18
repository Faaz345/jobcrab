import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, encryptJson, decryptJson } from "@/lib/encryption";

// Set the encryption secret for tests
beforeAll(() => {
  process.env.ENCRYPTION_SECRET = "test-secret-key-for-unit-tests!!";
});

describe("Encryption", () => {
  it("should encrypt and decrypt a string", () => {
    const plaintext = "Hello, World!";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "same-input";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("should encrypt and decrypt a JSON object", () => {
    const data = {
      email: "test@gmail.com",
      appPassword: "abcd1234efgh5678",
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
    };
    const encrypted = encryptJson(data);
    const decrypted = decryptJson<typeof data>(encrypted);
    expect(decrypted).toEqual(data);
  });

  it("should fail to decrypt with wrong key", () => {
    const encrypted = encrypt("secret data");
    process.env.ENCRYPTION_SECRET = "different-key-will-cause-failure";
    expect(() => decrypt(encrypted)).toThrow();
    // Restore
    process.env.ENCRYPTION_SECRET = "test-secret-key-for-unit-tests!!";
  });

  it("should handle empty string", () => {
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("should handle unicode text", () => {
    const plaintext = "日本語テスト 🎉";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
