import * as Application from 'expo-application';
import nacl from 'tweetnacl';
import {MMKV} from '../Mmkv';

const DEVICE_CODE_KEY = 'adultDeviceCode';
const ACCESS_SIGNATURE_KEY = 'adultAccessSignature';
const MESSAGE_PREFIX = 'ngotakstreamqx-adult-v1:';
export const ADULT_ACCESS_PUBLIC_KEY_B64 =
  'zQGWv8Oho0NIPZqlW+E2AOzmbnWu6Ng9qHHq+sKpSy0=';
const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(input: string): Uint8Array | null {
  let clean = input;
  while (clean.endsWith('=')) {
    clean = clean.slice(0, -1);
  }
  if (!clean || /[^A-Za-z0-9+/]/.test(clean)) {
    return null;
  }
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    const value = BASE64_ALPHABET.indexOf(clean[i]);
    if (value === -1) {
      continue;
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (buffer >> bits) & 255;
    }
  }
  return index === out.length ? out : out.subarray(0, index);
}

function randomUuid(): string {
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) {
      out += '-';
    }
  }
  return out;
}

export function getDeviceCode(): string {
  try {
    const androidId = Application.getAndroidId?.();
    if (typeof androidId === 'string' && androidId.length >= 8) {
      return androidId.toLowerCase();
    }
  } catch {}
  const stored = MMKV.getString(DEVICE_CODE_KEY);
  if (stored) {
    return stored;
  }
  const generated = randomUuid();
  MMKV.setString(DEVICE_CODE_KEY, generated);
  return generated;
}

export function formatDeviceCode(code: string): string {
  return (code.match(/.{1,4}/g) || [code]).join('-').toUpperCase();
}

function buildMessage(deviceCode: string): Uint8Array {
  const text =
    MESSAGE_PREFIX + deviceCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i) & 255;
  }
  return bytes;
}

export function verifyAdultAccessKey(key: string): boolean {
  try {
    const signature = base64ToBytes(key.replace(/\s+/g, ''));
    const publicKey = base64ToBytes(ADULT_ACCESS_PUBLIC_KEY_B64);
    if (
      !signature ||
      signature.length !== nacl.sign.signatureLength ||
      !publicKey ||
      publicKey.length !== nacl.sign.publicKeyLength
    ) {
      return false;
    }
    return nacl.sign.detached.verify(
      buildMessage(getDeviceCode()),
      signature,
      publicKey,
    );
  } catch {
    return false;
  }
}

export function getStoredAccessSignature(): string | null {
  return MMKV.getString(ACCESS_SIGNATURE_KEY) || null;
}

export function storeAccessSignature(key: string): boolean {
  const clean = key.replace(/\s+/g, '');
  if (!verifyAdultAccessKey(clean)) {
    return false;
  }
  MMKV.setString(ACCESS_SIGNATURE_KEY, clean);
  return true;
}

export function clearAccessSignature(): void {
  MMKV.removeItem(ACCESS_SIGNATURE_KEY);
}

export function hasAdultAccess(): boolean {
  const signature = MMKV.getString(ACCESS_SIGNATURE_KEY) || null;
  return signature ? verifyAdultAccessKey(signature) : false;
}
