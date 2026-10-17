import { titleizeForDisplay } from "./titleizeForDisplay";

async function printed(schema: any): Promise<any> {
  return JSON.parse(await titleizeForDisplay(schema));
}

describe("titleizeForDisplay", () => {
  it("dereferences local $refs before titleizing", async () => {
    const result = await printed({
      type: "object",
      properties: {
        a: { $ref: "#/definitions/thing" },
      },
      definitions: {
        thing: { type: "string" },
      },
    });

    expect(JSON.stringify(result)).not.toContain("$ref");
    expect(typeof result.title).toBe("string");
    expect(typeof result.properties.a.title).toBe("string");
  });

  it("adds titles to the schema and every untitled subschema", async () => {
    const result = await printed({
      type: "object",
      properties: {
        foo: { type: "string" },
        bar: { type: "number" },
      },
    });

    expect(typeof result.title).toBe("string");
    expect(typeof result.properties.foo.title).toBe("string");
    expect(typeof result.properties.bar.title).toBe("string");
  });

  it("keeps existing titles", async () => {
    const result = await printed({ title: "mine", type: "string" });
    expect(result.title).toBe("mine");
  });

  it("generates deterministic titles", async () => {
    const schema = { type: "object", properties: { foo: { type: "string" } } };
    expect(await titleizeForDisplay(schema)).toBe(await titleizeForDisplay(schema));
  });

  it("rejects circular $refs instead of hanging", async () => {
    await expect(titleizeForDisplay({
      title: "node",
      type: "object",
      properties: { child: { $ref: "#/definitions/node" } },
      definitions: {
        node: {
          title: "node",
          type: "object",
          properties: { next: { $ref: "#/definitions/node" } },
        },
      },
    })).rejects.toThrow(/circular/i);
  });

  it("returns pretty-printed JSON text", async () => {
    const text = await titleizeForDisplay({ title: "foo" });
    expect(text).toBe(JSON.stringify({ title: "foo" }, null, 2));
  });

  it("passes non-object schemas through untouched", async () => {
    expect(await titleizeForDisplay(true)).toBe("true");
    expect(await titleizeForDisplay(null)).toBe("null");
  });
});
