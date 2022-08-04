import { ExecutionArgs, PartialBy } from "./deps.ts";

export type GraphQLExecutionArgs = PartialBy<ExecutionArgs, "document">;
