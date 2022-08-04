import {
  createHandler as createWsHandler,
  createServerSocketHandler,
  validateSchema,
} from "../deps.ts";
import { GraphQLExecutionArgs } from "../types.ts";

/** Create `Request` handler compliant GraphQL over WebSocket server.
 * @throws `AggregateError` - When GraphQL schema validation error has occurred.
 * ```ts
 * import { createHandler } from "https://deno.land/x/graphql_websocket@$VERSION/graphql_transport_ws/mod.ts";
 * import { serve } from "https://deno.land/std@$VERSION/http/mod.ts";
 * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
 *
 * const handler = createHandler({
 *   schema: buildSchema(`type Query { hello: String }
 * type Subscription {
 *   greetings: String!
 * }`),
 *   rootValue: {
 *     greetings: async function* () {
 *       for (const hi of ["Hi", "Bonjour", "Hola", "Ciao", "Zdravo"]) {
 *         yield { greetings: hi };
 *       }
 *     },
 *   },
 * });
 *
 * serve(handler);
 * ```
 */
export default function createHandler(
  params: GraphQLExecutionArgs,
): (req: Request) => Promise<Response> {
  const validationResult = validateSchema(params.schema);
  if (validationResult.length) {
    throw new AggregateError(
      validationResult,
      "GraphQL schema validation error",
    );
  }
  const socketHandler = createServerSocketHandler(params.schema);
  const handler = createWsHandler(socketHandler);

  return handler;
}
