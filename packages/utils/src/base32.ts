const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function normalizeBase32(value: string): string {
  const trimmed = value.trimEnd();
  let end = trimmed.length;
  while (end > 0 && trimmed[end - 1] === "=") {
    end -= 1;
  }
  let result = "";
  for (let i = 0; i < end; i++) {
    const char = trimmed[i];
    if (char !== " " && char !== "\n" && char !== "\t" && char !== "\r") {
      result += char;
    }
  }
  return result.toUpperCase();
}

export function base32Encode(bytes: Uint8Array): string {
  let output = "";
  let buffer = 0;
  let bitsLeft = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      const index = (buffer >> (bitsLeft - 5)) & 31;
      output += BASE32_ALPHABET[index];
      bitsLeft -= 5;
    }
  }

  if (bitsLeft > 0) {
    const index = (buffer << (5 - bitsLeft)) & 31;
    output += BASE32_ALPHABET[index];
  }

  return output;
}

export function base32Decode(value: string): Uint8Array {
  const normalized = normalizeBase32(value);
  let buffer = 0;
  let bitsLeft = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid base32 character");
    }

    buffer = (buffer << 5) | index;
    bitsLeft += 5;

    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }

  return new Uint8Array(bytes);
}
