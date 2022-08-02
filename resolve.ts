import { has, isObject, isString, JSON, json } from "./deps.ts";
import { MessageType } from "./constants.ts";
import {
  CompleteMessage,
  Message,
  NextMessage,
  SubscribeMessage,
} from "./types.ts";

export function resolveData(
  data: unknown,
): [data: Message] | [data: undefined, error: SyntaxError] {
  if (!isString(data)) {
    return [, Error("Only strings are parsable messages")];
  }

  const [d, error] = JSON.parse(data);

  if (error) {
    return [, error];
  }

  return validateMessage(d);
}

export function validateMessage(
  value: json,
): [data: Message] | [data: undefined, error: Error] {
  if (!isObject(value) || Array.isArray(value)) {
    return [
      ,
      Error(
        `Message is expected to be an plain object`,
      ),
    ];
  }

  if (!has(value, "type")) {
    return [, Error(`Message is missing the 'type' property`)];
  }

  if (!isString(value.type)) {
    return [, Error(`Message is expects the 'type' property to be a string`)];
  }

  switch (value.type) {
    case MessageType.ConnectionInit:
    case MessageType.ConnectionAck:
    case MessageType.Ping:
    case MessageType.Pong: {
      if (has(value, "payload") && !isObject(value.payload)) {
        return [, Error(`Invalid data type. "payload" must be plain object`)];
      }

      return [value as Message];
    }

    case MessageType.Subscribe: {
      if (!has(value, "payload")) {
        return [, Error(`Missing property. "payload"`)];
      }
      if (!has(value, "id")) {
        return [, Error(`Missing property. "id"`)];
      }
      if (!isString(value.id)) {
        return [
          ,
          Error(
            `Invalid data type. "id" must be string`,
          ),
        ];
      }
      if (!isObject(value.payload)) {
        return [, Error(`Invalid data thye. "payload" must be plain object`)];
      }

      return [value as SubscribeMessage];
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
      return [, Error(`Invalid message 'type' property "${value.type}"`)];
    }
  }
}
