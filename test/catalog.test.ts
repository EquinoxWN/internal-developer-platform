import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCatalog } from "../src/catalog.js";

const valid = `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payments-api
spec:
  type: service
  lifecycle: experimental
  owner: group:payments
`;

test("Backstage's catalog rules accept a well-formed component", async () => {
  const { entities, problems } = await validateCatalog(valid);
  assert.deepEqual(problems, []);
  assert.equal(entities[0]?.metadata.namespace, "default", "the default namespace is filled in");
});

test("Backstage's catalog rules reject broken entities, one problem per document", async () => {
  const broken = [
    valid.replace("name: payments-api", "name: Payments API!"),
    valid.replace("  owner: group:payments\n", ""),
    valid.replace("kind: Component", "kind: Gadget"),
    "apiVersion: backstage.io/v1alpha1\nkind: Component\nmetadata: {name: x}\nspec: {type: service, lifecycle: experimental, owner: team, extra: [}\n",
  ];
  for (const text of broken) {
    const { problems } = await validateCatalog(text);
    assert.equal(problems.length, 1, text);
  }
});
