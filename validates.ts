import {
  createHttpError,
  has,
  HttpError,
  isNull,
  isPlainObject,
  isString,
  Status,
} from "./deps.ts";
import { MessageType } from "./constants.ts";
import {
  CompleteMessage,
  GraphQLParameters,
  Message,
  NextMessage,
  SubscribeMessage,
} from "./types.ts";

export function validateWebSocketRequest(req: Request): [result: true] | [
  result: false,
  error: HttpError,
] {
  if (req.method !== "GET") {
    return [
      false,
      createHttpError(Status.MethodNotAllowed, `Invalid HTTP Request method.`),
    ];
  }

  const upgrade = req.headers.get("upgrade");

  if (isNull(upgrade)) {
    return [
      false,
      createHttpError(
        Status.BadRequest,
        `Missing header. "Upgrade"`,
      ),
    ];
  }

  if (upgrade.toLowerCase() !== "websocket") {
    return [
      false,
      createHttpError(
        Status.BadRequest,
        `Invalid header. "Upgrade" header must be "websocket"`,
      ),
    ];
  }

  const connection = req.headers.get("connection");
  if (isNull(connection)) {
    return [
      false,
      createHttpError(Status.BadRequest, `Missing header. "Connection"`),
    ];
  }
  if (connection.toLowerCase() !== "upgrade") {
    return [
      false,
      createHttpError(
        Status.BadRequest,
        `Invalid header. "Connection" header must be "Upgrade"`,
      ),
    ];
  }
  const secWebSocketKey = req.headers.get("Sec-WebSocket-Key");
  if (isNull(secWebSocketKey)) {
    return [
      false,
      createHttpError(Status.BadRequest, `Missing header. "Sec-WebSocket-Key"`),
    ];
  }

  const secWebSocketVersion = req.headers.get("Sec-WebSocket-Version");
  if (isNull(secWebSocketVersion)) {
    return [
      false,
      createHttpError(
        Status.BadRequest,
        `Missing header. "Sec-WebSocket-Version"`,
      ),
    ];
  }
  if (secWebSocketVersion !== "13") {
    return [
      false,
      createHttpError(
        Status.BadRequest,
        `Invalid header. "Sec-WebSocket-Version" must be "13"`,
      ),
    ];
  }

  return [true];
}

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

export function validateGraphQLParameters(
  value: unknown,
): [data: GraphQLParameters] | [data: undefined, error: Error] {
  if (!isPlainObject(value)) {
    return [
      ,
      Error(
        `Invalid field. "payload" must be plain object.`,
      ),
    ];
  }

  if (!has(value, "query")) {
    return [
      ,
      Error(
        `Missing field. "query"`,
      ),
    ];
  }

  if (!isString(value.query)) {
    return [
      ,
      Error(
        `Invalid field. "query" must be string.`,
      ),
    ];
  }

  if (
    has(value, "variables") &&
    (!isNull(value.variables) && !isPlainObject(value.variables))
  ) {
    return [
      ,
      Error(
        `Invalid field. "variables" must be plain object or null`,
      ),
    ];
  }
  if (
    has(value, "operationName") &&
    (!isNull(value.operationName) && !isString(value.operationName))
  ) {
    return [
      ,
      Error(
        `Invalid field. "operationName" must be string or null.`,
      ),
    ];
  }
  if (
    has(value, "extensions") &&
    (!isNull(value.extensions) && !isPlainObject(value.extensions))
  ) {
    return [
      ,
      Error(
        `Invalid field. "extensions" must be plain object or null`,
      ),
    ];
  }

  const { query, ...rest } = value;

  return [{
    operationName: null,
    variableValues: null,
    extensions: null,
    query,
    ...rest,
  }];
}
