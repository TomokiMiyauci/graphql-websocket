import { MessageType } from "./constants.ts";
import { ExecutionArgs, GraphQLError, json, PartialBy } from "./deps.ts";

interface BaseMessage {
  type: MessageType;
}

type PartialGraphQLParameter = keyof Omit<GraphQLParameters, "query">;

export interface SubscribeMessage extends BaseMessage {
  type: MessageType.Subscribe;
  payload: Readonly<PartialGraphQLParameters>;
}

export type PartialGraphQLParameters = PartialBy<
  GraphQLParameters,
  PartialGraphQLParameter
>;

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

export interface ExecutionResult<
  Data = Record<string, unknown>,
  Extensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: Data | null;
  extensions?: Extensions;
}

export interface NextMessage extends BaseMessage {
  type: MessageType.Next;
  payload: ExecutionResult;
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.Error;
  payload: GraphQLError[];
}

export interface CompleteMessage extends BaseMessage {
  type: MessageType.Complete;
}

export type Message =
  | SubscribeMessage
  | NextMessage
  | ErrorMessage
  | CompleteMessage;

export type GraphQLExecutionArgs = PartialBy<ExecutionArgs, "document">;
