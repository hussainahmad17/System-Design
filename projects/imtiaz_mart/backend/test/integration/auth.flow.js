// End-to-end auth flow against a real MongoDB TEST database.
// Run: npm run test:integration   (uses MONGODB_URI's cluster with database imtiaz_mart_test)
//
// Safety: refuses to run unless the database name ends with "_test".
// It only deletes the users it created itself (by _id), never anything else.
import assert from "node:assert/strict";
import mongoose from "mongoose";

// Use TEST_MONGODB_URI if set; otherwise take MONGODB_URI and swap only the database name
// to imtiaz_mart_test (same cluster, separate database).
function testUri() {
  if (process.env.TEST_MONGODB_URI) return process.env.TEST_MONGODB_URI;
  const m = (process.env.MONGODB_URI ?? "").match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (!m) {
    console.error("Set MONGODB_URI (or TEST_MONGODB_URI) in .env.");
    process.exit(1);
  }
  return `${m[1]}/imtiaz_mart_test${m[3] ?? ""}`;
}
process.env.MONGODB_URI = testUri(); // the app reads MONGODB_URI

const { connectMongo, disconnectMongo } = await import("../../src/db/mongo.js");
const { createApp } = await import("../../src/app.js");
const { warmUpIdentityIndex, identityIndexStats } = await import("../../src/modules/auth/identityIndex.js");
const { User } = await import("../../src/modules/users/user.model.js");

await connectMongo();
const dbName = mongoose.connection.name;
if (!dbName.endsWith("_test")) {
  console.error(`Refusing to run: connected database "${dbName}" does not end with _test.`);
  await disconnectMongo();
  process.exit(1);
}
await User.createIndexes();
await warmUpIdentityIndex();

const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api/v1/auth`;
const created = [];
const tag = Date.now().toString(36);
const person = { username: `ali_${tag}`, email: `ali.${tag}@example.com`, password: "leather-jacket-42", firstName: "Ali", lastName: "Khan" };

async function call(method, path, { body, token, cookie } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token && { authorization: `Bearer ${token}` }),
      ...(cookie && { cookie }),
    },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null, cookie: res.headers.get("set-cookie") };
}
const step = (name) => console.log(`  ✔ ${name}`);

try {
  console.log(`Running against ${dbName}`);

  let r = await call("GET", `/availability?email=${person.email}`);
  assert.equal(r.status, 200);
  assert.equal(r.json.available, true);
  assert.equal(identityIndexStats().dbChecks, 0, "new email should be answered by the bloom filter alone");
  step("availability: new email answered from the bloom filter, 0 DB queries");

  r = await call("POST", "/register", { body: person });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  created.push(r.json.user.id);
  assert.ok(r.json.accessToken);
  assert.equal(r.json.user.passwordHash, undefined, "never return the hash");
  assert.match(r.cookie, /rt=.*HttpOnly.*SameSite=Strict/i);
  step("register: 201, access token in body, refresh token in httpOnly cookie, no hash leaked");

  r = await call("GET", `/availability?username=${person.username.toUpperCase()}`);
  assert.equal(r.json.available, false);
  step("availability: taken username (any case) -> bloom 'maybe' -> confirmed by indexed DB lookup");

  r = await call("POST", "/register", { body: { ...person, username: `other_${tag}` } });
  assert.equal(r.status, 409);
  assert.ok(r.json.error.details.email);
  step("register again with same email: 409 with field message");

  r = await call("POST", "/login", { body: { identifier: person.email, password: "wrong-password" } });
  assert.equal(r.status, 401);
  r = await call("POST", "/login", { body: { identifier: `ghost_${tag}`, password: "whatever123" } });
  assert.equal(r.status, 401);
  step("login: wrong password and unknown user both give the same 401");

  r = await call("POST", "/login", { body: { identifier: person.username, password: person.password } });
  assert.equal(r.status, 200);
  const access = r.json.accessToken;
  const cookie = r.cookie.split(";")[0];
  step("login by username: 200");

  r = await call("GET", "/me", { token: access });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json.user).sort(), ["email", "firstName", "id", "lastName", "role", "username"]);
  step("me: returns only public fields");

  r = await call("POST", "/refresh", { cookie });
  assert.equal(r.status, 200);
  assert.ok(r.json.accessToken);
  step("refresh: cookie -> new access token");

  r = await call("POST", "/logout-all", { token: access });
  assert.equal(r.status, 204);
  r = await call("POST", "/refresh", { cookie });
  assert.equal(r.status, 401);
  step("logout-all: old refresh token is rejected (tokenVersion bumped)");

  // Prove the indexes are used, as docs/db_optimization_techniques.md (#11) says: don't guess, EXPLAIN
  const plan = await User.find({ email: person.email }, { _id: 0, email: 1 }).explain("executionStats");
  const stats = plan.executionStats;
  const planText = JSON.stringify(plan.queryPlanner.winningPlan);
  assert.ok(planText.includes("IXSCAN") || planText.includes("EXPRESS_IXSCAN"), planText);
  assert.equal(stats.totalDocsExamined, 0, "covered query: answered from the index alone");
  step(`EXPLAIN email lookup: index scan, keys examined ${stats.totalKeysExamined}, documents read ${stats.totalDocsExamined} (covered)`);

  console.log("All auth flow checks passed. Bloom stats:", JSON.stringify(identityIndexStats()));
} finally {
  if (created.length) await User.deleteMany({ _id: { $in: created } }); // only our own test users
  server.close();
  await disconnectMongo();
}
