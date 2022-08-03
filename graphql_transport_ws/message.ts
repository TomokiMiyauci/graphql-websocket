import {
  ExecutionResult,
  GraphQLError,
  has,
  isPlainObject,
  isString,
  JSON,
  PartialBy,
} from "../deps.ts";
import { GraphQLParameters } from "../types.ts";
import { validateGraphQLParameters } from "../validates.ts";

export enum MessageType {
  ConnectionInit = "connection_init",
  ConnectionAck = "connection_ack",
  Ping = "ping",
  Pong = "pong",
  Subscribe = "subscribe",
  Next = "next",
  Error = "error",
  Complete = "complete",
}

interface BaseMessage {
  readonly type: MessageType;
}

type WithId = {
  readonly id: string;
};

type PartialGraphQLParameter = keyof Omit<GraphQLParameters, "query">;
export type PartialGraphQLParameters = PartialBy<
  GraphQLParameters,
  PartialGraphQLParameter
>;

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

export type BidirectionalMessage = PingMessage | PongMessage | CompleteMessage;

export type ClientMessage = ConnectionInitMessage | SubscribeMessage;

export type ServerMessage =
  | ConnectionAckMessage
  | ConnectionAckMessage
  | NextMessage
  | ErrorMessage;

export type Message =
  | BidirectionalMessage
  | ClientMessage
  | ServerMessage;

export function validateMessage(
  value: unknown,
): [data: Message] | [data: undefined, error: Error] {
  if (!isPlainObject(value)) {
    return [
      ,
      Error(
        `Invalid data type. Must be plain object.`,
      ),
    ];
  }

  if (!has(value, "type")) {
    return [, Error(`Missing field. Must include "type" field.`)];
  }
  if (!isString(value.type)) {
    return [, Error(`Invalid field. "type" field of value must be string.`)];
  }

  switch (value.type) {
    case MessageType.ConnectionInit:
    case MessageType.ConnectionAck:
    case MessageType.Ping:
    case MessageType.Pong: {
      if (has(value, "payload") && !isPlainObject(value.payload)) {
        return [, Error(`Invalid field. "payload" must be plain object.`)];
      }

      return [value as Message];
    }

    case MessageType.Subscribe: {
      if (!has(value, "id")) {
        return [, Error(`Missing field. "id"`)];
      }
      if (!isString(value.id)) {
        return [
          ,
          Error(
            `Invalid field. "id" must be string.`,
          ),
        ];
      }
      if (!has(value, "payload")) {
        return [, Error(`Missing field. "payload"`)];
      }

      const graphqlParametersResult = validateGraphQLParameters(value.payload);

      if (!graphqlParametersResult[0]) {
        return graphqlParametersResult;
      }

      return [
        { ...value, payload: graphqlParametersResult[0] } as SubscribeMessage,
      ];
    }

    case MessageType.Next: {
      if (!has(value, "id")) {
        return [, Error(`Missing property. "id"`)];
      }
      if (!has(value, "payload")) {
        return [, Error(`Missing property. "payload"`)];
      }
      return [value as NextMessage];
    }

    case MessageType.Complete: {
      if (!has(value, "id")) {
        return [, Error(`Missing property. "id"`)];
      }

      return [value as CompleteMessage];
    }

    default: {
      return [
        ,
        Error(
          `Invalid field. "type" field of "${value.type}" is not supported.`,
        ),
      ];
    }
  }
}

export function parseMessage(
  message: unknown,
): [data: Message] | [data: undefined, error: SyntaxError | TypeError] {
  if (!isString(message)) {
    return [, TypeError("Invalid data type. Message must be string.")];
  }

  const [data, error] = JSON.parse(message);

  if (error) {
    return [, error];
  }

  return validateMessage(data);
}

interface Messenger {
  pongMsg(): PongMessage;
  connectionArcMsg(): ConnectionAckMessage;
  nextMsg(id: string, payload: ExecutionResult): NextMessage;
  errorMsg(id: string, errors: ReadonlyArray<GraphQLError>): ErrorMessage;
  completeMsg(id: string): CompleteMessage;
}

export class MessengerImpl implements Messenger {
  pongMsg(): PongMessage {
    return {
      type: MessageType.Pong,
    };
  }

  connectionArcMsg(): ConnectionAckMessage {
    return {
      type: MessageType.ConnectionAck,
    };
  }

  nextMsg(
    id: string,
    payload: ExecutionResult,
  ): NextMessage {
    const msg: NextMessage = {
      id,
      type: MessageType.Next,
      payload,
    };

    return msg;
  }

  completeMsg(id: string): CompleteMessage {
    const msg: CompleteMessage = {
      id,
      type: MessageType.Complete,
    };

    return msg;
  }

  errorMsg(id: string, errors: readonly GraphQLError[]): ErrorMessage {
    const errorMessage: ErrorMessage = {
      id,
      type: MessageType.Error,
      payload: errors,
    };
    return errorMessage;
  }
}
