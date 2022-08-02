import { isString, JSON } from "./deps.ts";
import { Message } from "./types.ts";
import { validateMessage } from "./validates.ts";

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
