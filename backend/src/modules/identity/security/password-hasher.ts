import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const algorithm = 'scrypt';
const keyLength = 32;
const saltLength = 16;
const cost = 32768;
const blockSize = 8;
const parallelization = 1;
const maxMemory = 64 * 1024 * 1024;

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(saltLength);
    const derivedKey = await deriveKey(
      password,
      salt,
      keyLength,
      cost,
      blockSize,
      parallelization,
    );

    return [
      algorithm,
      cost,
      blockSize,
      parallelization,
      salt.toString('base64url'),
      derivedKey.toString('base64url'),
    ].join('$');
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const parsed = parseHash(encodedHash);
    if (!parsed) return false;

    const candidate = await deriveKey(
      password,
      parsed.salt,
      parsed.expected.length,
      parsed.cost,
      parsed.blockSize,
      parsed.parallelization,
    );

    return (
      candidate.length === parsed.expected.length &&
      timingSafeEqual(candidate, parsed.expected)
    );
  }
}

type ParsedHash = {
  blockSize: number;
  cost: number;
  expected: Buffer;
  parallelization: number;
  salt: Buffer;
};

function parseHash(encodedHash: string): ParsedHash | undefined {
  const [
    storedAlgorithm,
    costValue,
    blockSizeValue,
    parallelizationValue,
    saltValue,
    hashValue,
    ...rest
  ] = encodedHash.split('$');
  const parsedCost = Number(costValue);
  const parsedBlockSize = Number(blockSizeValue);
  const parsedParallelization = Number(parallelizationValue);

  if (
    rest.length ||
    storedAlgorithm !== algorithm ||
    !isValidParameter(parsedCost, 1_048_576) ||
    !isValidParameter(parsedBlockSize, 32) ||
    !isValidParameter(parsedParallelization, 16) ||
    !saltValue ||
    !hashValue
  ) {
    return undefined;
  }

  try {
    const salt = Buffer.from(saltValue, 'base64url');
    const expected = Buffer.from(hashValue, 'base64url');
    if (
      !salt.length ||
      salt.length > 64 ||
      !expected.length ||
      expected.length > 64
    )
      return undefined;

    return {
      blockSize: parsedBlockSize,
      cost: parsedCost,
      expected,
      parallelization: parsedParallelization,
      salt,
    };
  } catch {
    return undefined;
  }
}

function isValidParameter(value: number, maximum: number) {
  return Number.isSafeInteger(value) && value > 0 && value <= maximum;
}

function deriveKey(
  password: string,
  salt: Buffer,
  length: number,
  workFactor: number,
  r: number,
  p: number,
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      length,
      { N: workFactor, maxmem: maxMemory, p, r },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}
