export {
  isAsyncIterable,
  isNil,
  isNull,
  isObject,
  isPlainObject,
  isString,
  isUndefined,
} from "https://deno.land/x/isx@1.0.0-beta.19/mod.ts";
export {
  JSON,
  type json,
} from "https://deno.land/x/pure_json@1.0.0-beta.1/mod.ts";
export {
  type DocumentNode,
  execute,
  type ExecutionArgs,
  type ExecutionResult,
  getOperationAST,
  GraphQLError,
  GraphQLSchema,
  OperationTypeNode,
  parse,
  subscribe,
  validate,
  validateSchema,
} from "https://esm.sh/graphql@16.5.0";
export { Status } from "https://deno.land/std@0.150.0/http/http_status.ts";
export {
  createHttpError,
  HttpError,
} from "https://deno.land/std@0.150.0/http/http_errors.ts";
export { createHandler } from "https://deno.land/x/ws_handler@1.0.0-beta.1/mod.ts";
export {
  type GraphQLParameters,
  parseGraphQLParameters,
} from "https://deno.land/x/graphql_http@1.0.0-beta.17/mod.ts";
export { parseMessage as parseServerMessage } from "https://deno.land/x/graphql_transport_ws@1.0.0-beta.1/client/mod.ts";
export {
  MessageType,
  PrivateStatus,
  PROTOCOL,
} from "https://deno.land/x/graphql_transport_ws@1.0.0-beta.1/mod.ts";
export {
  createSocketHandler as createServerSocketHandler,
  parseMessage as parseClientMessage,
} from "https://deno.land/x/graphql_transport_ws@1.0.0-beta.1/server/mod.ts";

// deno-lint-ignore no-explicit-any
export function has<T extends Record<any, any>, K extends string>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return key in value;
}

export type PartialBy<T, K = keyof T> =
  Omit<T, K & keyof T> & Partial<Pick<T, K & keyof T>> extends infer U
    ? { [K in keyof U]: U[K] }
    : never;

export type RequiredBy<T, K = keyof T> =
  T & Required<Pick<T, K & keyof T>> extends infer U ? { [K in keyof U]: U[K] }
    : never;

export function tryCatchSync<R, E>(
  fn: () => R,
): [data: R] | [data: undefined, error: E] {
  try {
    return [fn()];
  } catch (er) {
    return [, er];
  }
}
