const UINT32_RANGE = 0x100000000;

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("maxExclusive must be a positive safe integer");
  }

  if (maxExclusive > UINT32_RANGE) {
    throw new Error("maxExclusive cannot exceed 2^32");
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const value = new Uint32Array(1);

  do {
    crypto.getRandomValues(value);
  } while (value[0]! >= limit);

  return value[0]! % maxExclusive;
}

export function secureRandomFloat(): number {
  return secureRandomInt(UINT32_RANGE) / UINT32_RANGE;
}

export function secureRandomString(alphabet: string, length: number): string {
  if (!alphabet) {
    throw new Error("alphabet is required");
  }

  if (!Number.isSafeInteger(length) || length < 0) {
    throw new Error("length must be a non-negative safe integer");
  }

  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += alphabet[secureRandomInt(alphabet.length)]!;
  }
  return result;
}
