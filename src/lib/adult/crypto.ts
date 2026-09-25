import nacl from 'tweetnacl';

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(input: string): Uint8Array | null {
  let clean = input.replace(/\s+/g, '');
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

export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i++;
      }
    }
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    }
  }
  return Uint8Array.from(bytes);
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i++];
    let code: number;
    if (byte < 0x80) {
      code = byte;
    } else if ((byte & 0xe0) === 0xc0) {
      code = ((byte & 31) << 6) | (bytes[i++] & 63);
    } else if ((byte & 0xf0) === 0xe0) {
      code =
        ((byte & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    } else {
      code =
        ((byte & 7) << 18) |
        ((bytes[i++] & 63) << 12) |
        ((bytes[i++] & 63) << 6) |
        (bytes[i++] & 63);
    }
    out += String.fromCodePoint(code);
  }
  return out;
}

export function deriveRegistryKey(seed: string): Uint8Array {
  return nacl.hash(utf8Encode(seed)).slice(0, nacl.secretbox.keyLength);
}

export function decryptRegistry(blob: string, seed: string): string | null {
  try {
    const data = base64ToBytes(blob);
    if (
      !data ||
      data.length <= nacl.secretbox.overheadLength + nacl.secretbox.nonceLength
    ) {
      return null;
    }
    const nonce = data.slice(0, nacl.secretbox.nonceLength);
    const box = data.slice(nacl.secretbox.nonceLength);
    const opened = nacl.secretbox.open(box, nonce, deriveRegistryKey(seed));
    if (!opened) {
      return null;
    }
    return utf8Decode(opened);
  } catch {
    return null;
  }
}
