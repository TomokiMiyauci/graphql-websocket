import {
  createHttpError,
  has,
  HttpError,
  isNull,
  isPlainObject,
  isString,
  Status,
} from "./deps.ts";
import { GraphQLParameters } from "./types.ts";

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
