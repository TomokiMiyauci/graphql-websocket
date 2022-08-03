import { ExecutionResult, RequiredBy } from "./deps.ts";

export function isRequestError(
  executionResult: ExecutionResult,
): executionResult is RequiredBy<Omit<ExecutionResult, "data">, "errors"> {
  return !("data" in executionResult);
}
