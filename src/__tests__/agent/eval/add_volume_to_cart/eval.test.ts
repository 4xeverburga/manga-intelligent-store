/**
 * Eval — add_volume_to_cart
 *
 * Each scenario is a `<name>.json` file (messages) with an optional
 * `<name>.golden.json` alongside it (expected assertions). If the golden file
 * exists, structured assertions are applied; otherwise only `steps > 0` is checked.
 *
 * Run: npm test -- add_volume_to_cart/eval
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { buildTools, runScenario, writeResults, applyGoldenAssertions } from '../_runner/runner';
import type { EvalScenario, GoldenAssertion, ScenarioResult } from '../_runner/types';

const TOOL_NAME = 'add_volume_to_cart';

interface LoadedScenario {
  scenario: EvalScenario;
  golden: GoldenAssertion | null;
}

function loadScenarios(): LoadedScenario[] {
  return readdirSync(__dirname)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.golden.json'))
    .map((f) => {
      const scenario = JSON.parse(readFileSync(join(__dirname, f), 'utf-8')) as EvalScenario;
      const goldenPath = join(__dirname, f.replace('.json', '.golden.json'));
      const golden = existsSync(goldenPath)
        ? (JSON.parse(readFileSync(goldenPath, 'utf-8')) as GoldenAssertion)
        : null;
      return { scenario, golden };
    });
}

describe(`Eval — ${TOOL_NAME}`, () => {
  const tools = buildTools();
  const results: ScenarioResult[] = [];

  afterAll(() => writeResults(TOOL_NAME, results));

  for (const { scenario, golden } of loadScenarios()) {
    it(
      `[${scenario.id}] ${scenario.description}`,
      async () => {
        const result = await runScenario(scenario, tools);
        results.push(result);

        console.log(`
━━━ ${scenario.id} ━━━`);
        for (const step of result.steps) {
          for (const tc of step.toolCalls ?? []) {
            console.log(`  → ${tc.toolName}(${JSON.stringify(tc.input)})`);
          }
          for (const tr of step.toolResults ?? []) {
            const out = JSON.stringify(tr.output ?? '').slice(0, 150);
            console.log(`  ← ${tr.toolName}: ${out}...`);
          }
        }
        console.log(`  ✍️  "${result.finalText.slice(0, 200)}..."`);

        if (golden) {
          applyGoldenAssertions(result, golden);
        } else {
          expect(result.steps.length).toBeGreaterThan(0);
        }
      },
      60_000
    );
  }
});
