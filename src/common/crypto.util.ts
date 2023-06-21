import * as crypto from 'crypto';
const algorithm = 'aes-128-gcm';
const sigHashAlg = 'sha256';

export function encryptText(text, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);

  const result = Buffer.concat([
    iv,
    cipher.update(text),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('hex');

  return result;
}

export function decryptText(text, key) {
  const encryptedText = Buffer.from(text, 'hex');
  const tag = encryptedText.slice(
    encryptedText.length - 16,
    encryptedText.length,
  );
  const iv = encryptedText.slice(0, 12);
  const toDecrypt = encryptedText.slice(12, encryptedText.length - tag.length);
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(key, 'hex'),
    iv,
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(toDecrypt), decipher.final()]).toString(
    'utf-8',
  );
}

export function generateWebhookSignature(secret, data) {
  const hmac = crypto.createHmac(sigHashAlg, secret);

  return (
    sigHashAlg +
    '=' +
    hmac.update(Buffer.from(JSON.stringify(data))).digest('hex')
  );
}
