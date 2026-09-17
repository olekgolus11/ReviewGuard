import assert from "node:assert/strict";
import test from "node:test";
import { createLeadHandler } from "./route.ts";

function request(payload: unknown) {
  return new Request("http://localhost/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

test("lead endpoint distinguishes malformed submissions", async () => {
  const response = await createLeadHandler(async () => ({ accepted: true }))(request("not-json"));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { outcome: "malformed" });
});

test("lead endpoint rejects malformed fields before delivery", async () => {
  let sent = false;
  const response = await createLeadHandler(async () => {
    sent = true;
    return { accepted: true };
  })(request({
    email: "invalid",
    restaurant: "Test Restaurant",
    googleUrl: "javascript:alert(1)",
    problem: "We reply once a week.",
  }));

  assert.equal(response.status, 400);
  assert.equal(sent, false);
  assert.deepEqual(await response.json(), { outcome: "malformed" });
});

test("lead endpoint silently accepts honeypot submissions", async () => {
  let sent = false;
  const response = await createLeadHandler(async () => {
    sent = true;
    return { accepted: true };
  })(request({ website: "https://spam.example" }));

  assert.equal(response.status, 200);
  assert.equal(sent, false);
  assert.deepEqual(await response.json(), { outcome: "honeypot" });
});

test("lead endpoint confirms genuine notification acceptance", async () => {
  const response = await createLeadHandler(async () => ({ accepted: true }))(request({
    email: "operator@example.com",
    restaurant: "Test Restaurant",
    googleUrl: "https://maps.google.com/example",
    problem: "We reply once a week.",
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { outcome: "accepted" });
});

test("lead endpoint distinguishes rejected notification delivery", async () => {
  const response = await createLeadHandler(async () => ({ accepted: false }))(request({
    email: "operator@example.com",
    restaurant: "Test Restaurant",
    googleUrl: "https://maps.google.com/example",
    problem: "We reply once a week.",
  }));

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { outcome: "delivery_failed" });
});
