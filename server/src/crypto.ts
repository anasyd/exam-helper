import { generateKeyPairSync, privateDecrypt, constants } from "node:crypto";

let _privateKey: string | null = null;
let _publicKeyPem: string | null = null;

export function initKeys(): void {
  const pair = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  _publicKeyPem = pair.publicKey;
  _privateKey = pair.privateKey;
}

export function getPublicKeyPem(): string {
  if (!_publicKeyPem) throw new Error("Crypto keys not initialized");
  return _publicKeyPem;
}

export function decryptApiKey(encryptedBase64: string): string {
  if (!_privateKey) throw new Error("Crypto keys not initialized");
  const buf = privateDecrypt(
    { key: _privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    Buffer.from(encryptedBase64, "base64"),
  );
  return buf.toString("utf8");
}
