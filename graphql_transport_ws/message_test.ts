import { describe, expect, it } from "../dev_deps.ts";
import { validateMessage } from "./message.ts";

describe("validateMessage", () => {
  it("should return error when message is not plain object", () => {
    const result = validateMessage("");
    expect(result[0]).toBeFalsy();
    expect(result[1]).toError(
      Error,
      `Invalid data type. Must be plain object.`,
    );
  });

  it(`should return error when message does not contain "type" field`, () => {
    const result = validateMessage({});
    expect(result[0]).toBeFalsy();
    expect(result[1]).toError(
      Error,
      `Missing field. Must include "type" field.`,
    );
  });

  it(`should return error when message "type" is not string`, () => {
    const result = validateMessage({ type: 1 });
    expect(result[0]).toBeFalsy();
    expect(result[1]).toError(
      Error,
      `Invalid field. "type" field of value must be string.`,
    );
  });

  it(`should return error when message "type" is unknown value`, () => {
    const result = validateMessage({ type: "test" });
    expect(result[0]).toBeFalsy();
    expect(result[1]).toError(
      Error,
      `Invalid field. "type" field of "test" is not supported.`,
    );
  });

  describe("[connection_init]", () => {
    it(`should return error when message "payload" is not plain object`, () => {
      const result = validateMessage({
        type: "connection_init",
        payload: [],
      });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "payload" must be plain object.`,
      );
    });
    it(`should return message when message is valid`, () => {
      const result = validateMessage({
        type: "connection_init",
      });
      expect(result[0]).toEqual({ type: "connection_init" });
      expect(result[1]).toBeUndefined();
    });
  });
  describe("[connection_ack]", () => {
    it(`should return error when message "payload" is not plain object`, () => {
      const result = validateMessage({
        type: "connection_ack",
        payload: [],
      });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "payload" must be plain object.`,
      );
    });
    it(`should return message when message is valid`, () => {
      const result = validateMessage({
        type: "connection_ack",
      });
      expect(result[0]).toEqual({ type: "connection_ack" });
      expect(result[1]).toBeUndefined();
    });
  });
  describe("[ping]", () => {
    it(`should return error when message "payload" is not plain object`, () => {
      const result = validateMessage({
        type: "ping",
        payload: [],
      });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "payload" must be plain object.`,
      );
    });
    it(`should return message when message is valid`, () => {
      const result = validateMessage({
        type: "ping",
      });
      expect(result[0]).toEqual({ type: "ping" });
      expect(result[1]).toBeUndefined();
    });
  });
  describe("[pong]", () => {
    it(`should return error when message "payload" is not plain object`, () => {
      const result = validateMessage({
        type: "pong",
        payload: [],
      });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "payload" must be plain object.`,
      );
    });
    it(`should return message when message is valid`, () => {
      const result = validateMessage({
        type: "pong",
      });
      expect(result[0]).toEqual({ type: "pong" });
      expect(result[1]).toBeUndefined();
    });
  });

  describe("[subscribe]", () => {
    it(`should return error when message "id" does not contain`, () => {
      const result = validateMessage({ type: "subscribe" });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Missing field. "id"`,
      );
    });
    it(`should return error when message "id" is not string`, () => {
      const result = validateMessage({ type: "subscribe", id: 0 });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "id" must be string.`,
      );
    });
    it(`should return error when message "payload" does not contain`, () => {
      const result = validateMessage({ type: "subscribe", id: "" });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Missing field. "payload"`,
      );
    });
    it(`should return error when message "payload" is not plain object`, () => {
      const result = validateMessage({ type: "subscribe", id: "", payload: 0 });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "payload" must be plain object.`,
      );
    });
    it(`should return error when message "payload.query" does not include`, () => {
      const result = validateMessage({
        type: "subscribe",
        id: "",
        payload: {},
      });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Missing field. "query"`,
      );
    });
    it(`should return error when message "payload.query" is not string`, () => {
      const result = validateMessage({
        type: "subscribe",
        id: "",
        payload: { query: 0 },
      });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "query" must be string.`,
      );
    });
    it(`should return error when message "payload.variables" is not plain object or null`, () => {
      const result = validateMessage({
        type: "subscribe",
        id: "",
        payload: { query: "", variables: undefined },
      });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "variables" must be plain object or null`,
      );
    });
    it(`should return error when message "payload.operationName" is not string or null`, () => {
      const result = validateMessage({
        type: "subscribe",
        id: "",
        payload: { query: "", operationName: undefined },
      });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "operationName" must be string or null.`,
      );
    });
    it(`should return error when message "payload.extensions" is not plain object or null`, () => {
      const result = validateMessage({
        type: "subscribe",
        id: "",
        payload: { query: "", extensions: undefined },
      });
      expect(result[0]).toBeFalsy();
      expect(result[1]).toError(
        Error,
        `Invalid field. "extensions" must be plain object or null`,
      );
    });
    it(`should return data when message is valid format`, () => {
      const result = validateMessage({
        type: "subscribe",
        id: "",
        payload: { query: "query { hello }" },
      });
      expect(result[0]).toEqual({
        type: "subscribe",
        id: "",
        payload: {
          operationName: null,
          variableValues: null,
          extensions: null,
          query: "query { hello }",
        },
      });
      expect(result[1]).toBeUndefined();
    });
  });
});
