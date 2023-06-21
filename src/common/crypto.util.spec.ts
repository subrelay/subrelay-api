import {
  decryptText,
  encryptText,
  generateWebhookSignature,
} from './crypto.util';

describe('Encryption and decryption', () => {
  const key = '0123456789abcdef0123456789abcdef';
  const plaintext = 'This is a secret message';

  test('Encrypt and decrypt a message', () => {
    const ciphertext = encryptText(plaintext, key);
    const decrypted = decryptText(ciphertext, key);

    expect(decrypted).toBe(plaintext);
  });

  test('Decrypting with the wrong key fails', () => {
    const ciphertext = encryptText(plaintext, key);
    const wrongKey = 'fedcba9876543210fedcba9876543210';

    expect(() => decryptText(ciphertext, wrongKey)).toThrow();
  });
});

describe('Webhook signatures', () => {
  const secret = '0123456789abcdef0123456789abcdef';
  const data = { foo: 'bar' };

  test('Generate and verify a webhook signature', () => {
    const signature = generateWebhookSignature(secret, data);
    expect(signature).toEqual(
      'sha256=622c570dc5a188c9a4a87b5a96e79ee384660e6df93e627d5ea34771f355faad',
    );
  });

  test('Verification with the wrong secret', () => {
    const signature = generateWebhookSignature(secret, data);
    const wrongSecret = 'fedcba9876543210fedcba9876543210';
    const wrongSignature = generateWebhookSignature(wrongSecret, data);

    expect(signature).not.toEqual(wrongSignature);
  });
});
