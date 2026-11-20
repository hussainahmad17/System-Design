import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../src/lib/password.js";

test("hashes with a random salt and verifies correctly", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  assert.notEqual(a, b, "same password, different salt, different hash");
  assert.match(a, /^scrypt\$32768\$8\$3\$/);
  assert.equal(await verifyPassword("correct horse battery", a), true);
  assert.equal(await verifyPassword("wrong password", a), false);
});

test("rejects malformed stored hashes", async () => {
  assert.equal(await verifyPassword("x", "not-a-hash"), false);
});
