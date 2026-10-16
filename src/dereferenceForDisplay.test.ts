import Dereferencer from "@json-schema-tools/dereferencer";
import { Transpiler } from "@json-schema-tools/transpiler";
import { dereferenceForDisplay, hasCyclicRefs } from "./dereferenceForDisplay";

async function printed(schema: any, resolveExternal?: (ref: string) => Promise<any>) {
  return JSON.parse(await dereferenceForDisplay(schema, resolveExternal));
}

describe("dereferenceForDisplay", () => {
  it("inlines the first local ref and links the next copy back to it", async () => {
    const result = await printed({
      properties: {
        a: { $ref: "#/definitions/baz" },
        b: { $ref: "#/definitions/baz" },
      },
      definitions: {
        baz: { title: "baz", type: "number" },
      },
    });

    expect(result.definitions).toBeUndefined();
    expect(result.properties.a).toEqual({
      "x-dereferenced-from": "#/definitions/baz",
      title: "baz",
      type: "number",
    });
    expect(result.properties.b).toEqual({
      $ref: "#/properties/a",
      "x-dereferenced-from": "#/definitions/baz",
    });
  });

  it("turns a circular ref into a link to the copy being written", async () => {
    const result = await printed({
      title: "node",
      type: "object",
      properties: {
        child: { $ref: "#/definitions/node" },
      },
      definitions: {
        node: {
          title: "node",
          type: "object",
          properties: {
            next: { $ref: "#/definitions/node" },
          },
        },
      },
    });

    expect(result.properties.child["x-dereferenced-from"]).toBe("#/definitions/node");
    expect(result.properties.child.properties.next).toEqual({
      $ref: "#/properties/child",
      "x-dereferenced-from": "#/definitions/node",
      "x-cycle": true,
    });
    expect(hasCyclicRefs({
      properties: {
        child: { $ref: "#/definitions/node" },
      },
      definitions: {
        node: {
          properties: { next: { $ref: "#/definitions/node" } },
        },
      },
    })).toBe(true);
  });

  it("links a ref to the document root without looping", async () => {
    const result = await printed({
      title: "root",
      properties: {
        self: { $ref: "#" },
      },
    });

    expect(result.properties.self).toEqual({
      $ref: "#",
      "x-dereferenced-from": "#",
      "x-cycle": true,
    });
  });

  it("keeps sibling keywords on their own copy", async () => {
    const result = await printed({
      properties: {
        a: { $ref: "#/definitions/baz" },
        b: { $ref: "#/definitions/baz", description: "extra" },
      },
      definitions: {
        baz: { title: "baz", type: "number" },
      },
    });

    expect(result.properties.a.$ref).toBeUndefined();
    expect(result.properties.b).toEqual({
      "x-dereferenced-from": "#/definitions/baz",
      title: "baz",
      type: "number",
      description: "extra",
    });
  });

  it("records an external ref and reuses one fetched document", async () => {
    const calls: string[] = [];
    const result = await printed({
      properties: {
        a: { $ref: "https://example.com/schema.json#/definitions/item" },
        b: { $ref: "https://example.com/schema.json#/definitions/item" },
      },
    }, async (ref: string) => {
      calls.push(ref);
      return {
        definitions: {
          item: { title: "item", type: "string" },
        },
      };
    });

    expect(calls).toEqual(["https://example.com/schema.json"]);
    expect(result.properties.a["x-dereferenced-from"]).toBe("https://example.com/schema.json#/definitions/item");
    expect(result.properties.a.title).toBe("item");
    expect(result.properties.b.$ref).toBe("#/properties/a");
  });

  it("leaves a non-circular schema transpileable", async () => {
    const text = await dereferenceForDisplay({
      title: "root",
      type: "object",
      properties: {
        a: { $ref: "#/definitions/baz" },
        b: { $ref: "#/definitions/baz" },
      },
      definitions: {
        baz: { title: "baz", type: "number" },
      },
    });
    const parsed = JSON.parse(text);
    expect(hasCyclicRefs(parsed)).toBe(false);
    const resolved = await new Dereferencer(parsed).resolve();
    const code = new Transpiler(resolved).to("typescript");
    expect(code).toContain("Baz");
  });

  it("reports a pointer that does not exist", async () => {
    await expect(dereferenceForDisplay({
      properties: { a: { $ref: "#/definitions/missing" } },
    })).rejects.toThrow("missing");
  });
});
