/**
 * Eval — check_volume_availability
 *
 * Loads all scenario JSON files in this directory and runs each through the
 * real chatbot tools (same setup as the production route). Results are written
 * to eval-results/check_volume_availability/<date>.json for manual inspection.
 *
 * Run: npm test -- check_volume_availability/eval
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { buildTools, runScenario, writeResults } from "../_runner/runner";
import type { EvalScenario, ScenarioResult } from "../_runner/types";

const TOOL_NAME = "check_volume_availability";

function loadScenarios(): EvalScenario[] {
  return readdirSync(__dirname)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(__dirname, f), "utf-8")) as EvalScenario);
}

describe(`Eval — ${TOOL_NAME}`, () => {
  const tools = buildTools();
  const results: ScenarioResult[] = [];

  afterAll(() => writeResults(TOOL_NAME, results));

  for (const scenario of loadScenarios()) {
    it(
      `[${scenario.id}] ${scenario.description}`,
      async () => {
        const result = await runScenario(scenario, tools);
        results.push(result);

        console.log(`\n━━━ ${scenario.id} ━━━`);
        for (const step of result.steps) {
          for (const tc of step.toolCalls ?? []) {
            console.log(`  → ${tc.toolName}(${JSON.stringify(tc.input)})`);
          }
          for (const tr of step.toolResults ?? []) {
            const out = JSON.stringify(tr.output ?? "").slice(0, 150);
            console.log(`  ← ${tr.toolName}: ${out}...`);
          }
        }
        console.log(`  ✍️  "${result.finalText.slice(0, 200)}..."`);

        expect(result.steps.length).toBeGreaterThan(0);
      },
      60_000
    );
  }
});
