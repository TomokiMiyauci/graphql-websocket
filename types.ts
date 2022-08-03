import { ExecutionArgs, json, PartialBy } from "./deps.ts";

/** GraphQL over HTTP Request parameters.
 * @see https://graphql.github.io/graphql-over-http/draft/#sec-Request-Parameters
 */
export type GraphQLParameters = {
  /** A Document containing GraphQL Operations and Fragments to execute. */
  query: string;

  /** Values for any Variables defined by the Operation. */
  variableValues: Record<string, json> | null;

  /** The name of the Operation in the Document to execute. */
  operationName: string | null;

  /** Reserved for implementors to extend the protocol however they see fit. */
  extensions: Record<string, json> | null;
};

export type GraphQLExecutionArgs = PartialBy<ExecutionArgs, "document">;
