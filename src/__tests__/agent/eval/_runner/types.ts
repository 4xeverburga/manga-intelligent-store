import type { ModelMessage } from "ai";

export type { ModelMessage };

export interface EvalScenario {
  id: string;
  description: string;
  messages: ModelMessage[];
}

export interface GoldenToolResult {
  /** Tool name to match against */
  tool: string;
  /** Field in the tool output to check (e.g. "success", "found", "ambiguous") */
  field: string;
  /** Expected value for that field */
  value: unknown;
  /** How many tool results must match. Default: at least 1 */
  count?: number;
}

export interface GoldenAssertion {
  expect: {
    /** Minimum number of agentic steps */
    minSteps?: number;
    /** Tool names that must appear at least once in tool calls */
    toolsUsed?: string[];
    /** Assertions on individual tool result fields */
    toolResults?: GoldenToolResult[];
  };
}

export interface StepResult {
  stepNumber: number;
  toolCalls?: Array<{ toolName: string; input: unknown }>;
  toolResults?: Array<{ toolName: string; output: unknown }>;
  text?: string;
}

export interface ScenarioResult {
  id: string;
  description: string;
  modelId: string;
  timestamp: string;
  messages: ModelMessage[];
  steps: StepResult[];
  finalText: string;
}
