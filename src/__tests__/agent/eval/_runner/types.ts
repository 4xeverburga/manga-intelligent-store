export interface EvalMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EvalScenario {
  id: string;
  description: string;
  messages: EvalMessage[];
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
  messages: EvalMessage[];
  steps: StepResult[];
  finalText: string;
}
