import { NoTitleError } from "@json-schema-tools/referencer";
import { referenceForDisplay } from "./referenceForDisplay";

function printed(schema: any): any {
  return JSON.parse(referenceForDisplay(schema));
}

describe("referenceForDisplay", () => {
  it("extracts titled subschemas into definitions as $refs", () => {
    const result = printed({
      title: "root",
      type: "object",
      properties: {
        a: { title: "a", type: "string" },
        b: { title: "b", type: "number" },
      },
    });

    expect(result.properties.a).toEqual({ $ref: "#/definitions/a", title: "a" });
    expect(result.properties.b).toEqual({ $ref: "#/definitions/b", title: "b" });
    expect(result.definitions.a).toEqual({ title: "a", type: "string" });
    expect(result.definitions.b).toEqual({ title: "b", type: "number" });
  });

  it("leaves a schema with no subschemas alone", () => {
    expect(printed({ title: "foo" })).toEqual({ title: "foo" });
  });

  it("throws when a subschema has no title", () => {
    expect(() => printed({
      title: "foo",
      properties: { bar: { type: "string" } },
    })).toThrow(NoTitleError);
  });

  it("returns pretty-printed JSON text", () => {
    const text = referenceForDisplay({ title: "foo" });
    expect(text).toBe(JSON.stringify({ title: "foo" }, null, 2));
  });

  it("passes non-object schemas through untouched", () => {
    expect(referenceForDisplay(true)).toBe("true");
    expect(referenceForDisplay(null)).toBe("null");
  });
});
