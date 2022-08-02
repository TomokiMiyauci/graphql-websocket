import { MessageType } from "./constants.ts";
import {
  ExecutionArgs,
  ExecutionResult,
  GraphQLError,
  json,
  PartialBy,
} from "./deps.ts";

interface BaseMessage {
  type: MessageType;
}

type WithId = {
  id: string;
};

type PartialGraphQLParameter = keyof Omit<GraphQLParameters, "query">;

export interface ConnectionInitMessage extends BaseMessage {
  type: MessageType.ConnectionInit;

  payload?: Record<string, unknown>;
}

export interface ConnectionAckMessage extends BaseMessage {
  type: MessageType.ConnectionAck;

  payload?: Record<string, unknown>;
}

export interface PingMessage extends BaseMessage {
  type: MessageType.Ping;
  payload?: Record<string, unknown>;
}

export interface PongMessage extends BaseMessage {
  type: MessageType.Pong;
  payload?: Record<string, unknown>;
}

export interface SubscribeMessage extends BaseMessage, WithId {
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

export interface NextMessage extends BaseMessage, WithId {
  type: MessageType.Next;
  payload: ExecutionResult;
}

export interface ErrorMessage extends BaseMessage, WithId {
  type: MessageType.Error;
  payload: readonly GraphQLError[];
}

export interface CompleteMessage extends BaseMessage, WithId {
  type: MessageType.Complete;
}

export type Message =
  | SubscribeMessage
  | NextMessage
  | ErrorMessage
  | CompleteMessage
  | ConnectionAckMessage
  | ConnectionInitMessage
  | PingMessage
  | PongMessage;

export type GraphQLExecutionArgs = PartialBy<ExecutionArgs, "document">;
