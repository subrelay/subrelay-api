import * as crypto from 'crypto';
const algorithm = 'aes-128-ebc';
const sigHashAlg = 'sha256';

export function encryptText(text, key) {
  const cipher = crypto.createCipheriv(algorithm, key, null);
  return Buffer.concat([cipher.update(text), cipher.final()]).toString('hex');
}

export function decryptText(text, key) {
  const encryptedText = Buffer.from(text.encryptedData, 'hex');
  const cipher = crypto.createDecipheriv(algorithm, Buffer.from(key), null);
  return Buffer.concat([cipher.update(encryptedText), cipher.final()]).toString(
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

export function verifyWebhookSignature(sig, secret, data) {
  const hmac = crypto.createHmac(sigHashAlg, secret);
  const digest = Buffer.from(
    sigHashAlg + '=' + hmac.update(JSON.stringify(data)).digest('hex'),
    'utf8',
  );

  if (sig.length !== digest.length || !crypto.timingSafeEqual(digest, sig)) {
    return false;
  }

  return true;
}
