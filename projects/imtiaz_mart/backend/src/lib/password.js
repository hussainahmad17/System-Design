import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// scrypt is built into Node (no native addon to compile) and is memory-hard,
// which makes GPU brute-force attacks expensive. Parameters follow OWASP guidance.
// It runs on libuv's thread pool, so hashing does not block the event loop.
const PARAMS = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

// Stored format: scrypt$N$r$p$salt$hash. Keeping the params in the string lets us
// raise them later without breaking existing passwords.
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LEN, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password, stored) {
  const [algo, N, r, p, saltB64, hashB64] = String(stored).split("$");
  if (algo !== "scrypt" || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  });
  // Constant-time compare: response time does not reveal how many bytes matched
  return timingSafeEqual(actual, expected);
}

// Used when the account does not exist: we still spend the same time hashing,
// so an attacker can't tell "no such user" from "wrong password" by timing.
let dummyHash;
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword("dummy-password-for-timing");
  await verifyPassword(password, dummyHash);
  return false;
}
