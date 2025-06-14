import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY as string // Must be 32 bytes for AES-256
const ENCRYPTION_IV = process.env.ENCRYPTION_IV as string // Must be 16 bytes for AES-256

if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
  throw new Error('Encryption key and IV must be set in environment variables')
}

if (Buffer.from(ENCRYPTION_KEY, 'base64').length !== 32) {
  throw new Error('Encryption key must be 32 bytes (base64 encoded)')
}

if (Buffer.from(ENCRYPTION_IV, 'base64').length !== 16) {
  throw new Error('Encryption IV must be 16 bytes (base64 encoded)')
}

export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'base64'),
    Buffer.from(ENCRYPTION_IV, 'base64')
  )
  let encrypted = cipher.update(text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  return encrypted
}

export function decrypt(encrypted: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'base64'),
    Buffer.from(ENCRYPTION_IV, 'base64')
  )
  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
} 