/** Workflow policy coverage using the pinned content toolchain's YAML parser. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(new URL("../thally-tooling/package.json", import.meta.url));
const { parse } = require("yaml");
const workflow = parse(readFileSync(".github/workflows/ci.yml", "utf8"));


test("merge groups compare against their actual base before selecting content-only CI", () => {
  const plan = workflow.jobs.verify.steps.find((step) => step.id === "plan");
  assert.equal(plan.env.BASE_SHA, "${{ github.event.pull_request.base.sha || github.event.merge_group.base_sha || inputs.base_sha }}");
  assert.equal(workflow.on.merge_group, null);
  assert.match(workflow.jobs.verify.if, /automation\/thally-framework-/);
});

test("untrusted candidate execution cannot restore or save setup-node dependency caches", () => {
  const setup = workflow.jobs.verify.steps.filter((step) => step.uses?.startsWith("actions/setup-node@"));
  assert.ok(setup.length > 0);
  for (const step of setup) {
    assert.equal(step.with["package-manager-cache"], false);
    assert.equal(step.with.cache, undefined);
  }
});

test("runtime tools execute only after a trusted main bootstrap proves the selected pin", () => {
  const steps = workflow.jobs.verify.steps;
  const checkout = steps.findIndex((step) => step.with?.repository === "thallylabs/thally");
  const prove = steps.findIndex((step) => step.name === "Prove runtime revision is on protected main");
  const parity = steps.findIndex((step) => step.name === "Verify generated runtime snapshot");
  assert.ok(checkout >= 0 && prove > checkout && parity > prove);
  assert.equal(steps[checkout].with.ref, "main");
  assert.equal(steps[checkout].with["fetch-depth"], 0);
  assert.equal(steps[checkout].with["persist-credentials"], false);
  const proof = steps[prove].run;
  const commands = [
    '[[ "$RUNTIME_SHA" =~ ^[0-9a-f]{40}$ ]]',
    'git -C runtime-source fetch --no-tags origin main',
    'git -C runtime-source merge-base --is-ancestor "$RUNTIME_SHA" origin/main',
    'git -C runtime-source checkout --detach "$RUNTIME_SHA"',
    'test "$(git -C runtime-source rev-parse HEAD)" = "$RUNTIME_SHA"',
  ];
  let previous = -1;
  for (const command of commands) {
    const position = proof.indexOf(command);
    assert.ok(position > previous, `Trust proof ordering: ${command}`);
    previous = position;
  }
  for (const index of [checkout, prove, parity]) {
    assert.equal(steps[index].if, "steps.plan.outputs.full == 'true'");
  }
  assert.match(steps[parity].run, /starter-runtime-contract\.mjs check/);
});

test("candidate content validation is unconditional and full validation retains provenance and artifact checks", () => {
  const steps = workflow.jobs.verify.steps;
  assert.equal(steps.find((step) => step.name === "Check authored content").if, undefined);
  for (const name of ["Verify generated runtime snapshot", "Check production types", "Install optional Cloudflare tooling", "Build managed runtime and content assets", "Verify managed content artifact", "Qualify installed customer navigation tooling"]) {
    assert.equal(steps.find((step) => step.name === name).if, "steps.plan.outputs.full == 'true'", name);
  }
});

test("installed navigation qualification runs after customer dependencies are installed", () => {
  const steps = workflow.jobs.verify.steps;
  const install = steps.findIndex((step) => step.name === "Install dependencies");
  const qualification = steps.findIndex((step) => step.name === "Qualify installed customer navigation tooling");
  assert.ok(qualification > install);
  assert.equal(steps[qualification].run, "node .github/scripts/verify-installed-navigation.mjs");
});

test("lifecycle-free CI prepares generated runtime modules before production type checking", () => {
  const steps = workflow.jobs.verify.steps;
  const install = steps.findIndex((step) => step.run === "npm ci --ignore-scripts");
  const generate = steps.findIndex((step) => step.run === "npm run runtime-sources:build");
  const typecheck = steps.findIndex((step) => step.run === "npm run typecheck");
  assert.ok(install >= 0 && generate > install && typecheck > generate);
  for (const index of [install, generate, typecheck]) {
    assert.equal(steps[index].if, "steps.plan.outputs.full == 'true'");
  }
});

test("provider installation is explicit and precedes the managed build", () => {
  const steps = workflow.jobs.verify.steps;
  const setup = steps.findIndex((step) => step.name === "Install optional Cloudflare tooling");
  const build = steps.findIndex((step) => step.name === "Build managed runtime and content assets");
  assert.ok(setup > 0 && setup < build);
  assert.equal(steps[setup].run, "npm run setup:cloudflare");
});
