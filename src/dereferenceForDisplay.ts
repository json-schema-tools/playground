import referenceResolver from "@json-schema-tools/reference-resolver";

const FROM = "x-dereferenced-from";
const CYCLE = "x-cycle";

type Json = any;
type ExternalResolver = (ref: string) => Promise<Json>;

interface Anchor {
  pointer: string;
}

/**
 * Print a schema with $refs removed, without dropping shared identity or
 * looping on a cycle.
 *
 * The first time a ref is used, its target is written in place and marked
 * with x-dereferenced-from. A later use of that same ref becomes a $ref to
 * the JSON pointer of that first copy. A use that points back at a ref still
 * being written is the same kind of link, with x-cycle set.
 * Root definitions and components are omitted; their contents live at the
 * first place they were referenced.
 */
export async function dereferenceForDisplay(
  schema: Json,
  resolveExternal: ExternalResolver = defaultResolveExternal,
): Promise<string> {
  if (schema === null || typeof schema !== "object") {
    return JSON.stringify(schema, null, 2);
  }

  const anchors = new Map<string, Anchor>();
  const stack: string[] = [];
  const documents = new Map<string, Json>();

  anchors.set("#", { pointer: "#" });
  stack.push("#");
  const printed = await write(schema, "#", schema, true);
  stack.pop();
  return JSON.stringify(printed, null, 2);

  async function write(value: Json, pointer: string, root: Json, isRoot = false): Promise<Json> {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      const items: Json[] = [];
      for (let i = 0; i < value.length; i++) {
        items.push(await write(value[i], pointer + "/" + escapeToken(String(i)), root));
      }
      return items;
    }
    if (typeof value.$ref === "string" && isPureRef(value, isRoot)) {
      return writeRef(value.$ref, pointer, root);
    }
    if (typeof value.$ref === "string") {
      return writeRefWithSiblings(value, pointer, root, isRoot);
    }
    return writeObject(value, pointer, root, isRoot);
  }

  async function writeRef(ref: string, pointer: string, root: Json): Promise<Json> {
    const anchor = anchors.get(ref);
    if (anchor && stack.indexOf(ref) !== -1) {
      return link(ref, anchor.pointer, true);
    }
    if (anchor && ref !== "#") {
      return link(ref, anchor.pointer, false);
    }

    anchors.set(ref, { pointer });
    stack.push(ref);
    try {
      const resolved = await resolveAgainst(ref, root);
      if (isPureRef(resolved.value, false)) {
        const inner = await writeRef(resolved.value.$ref, pointer, resolved.root);
        const innerAnchor = anchors.get(resolved.value.$ref);
        if (innerAnchor) {
          anchors.set(ref, innerAnchor);
        }
        return inner;
      }
      if (resolved.value === null || typeof resolved.value !== "object" || Array.isArray(resolved.value)) {
        return resolved.value;
      }
      return await writeObject(resolved.value, pointer, resolved.root, false, ref);
    } finally {
      stack.pop();
    }
  }

  async function writeRefWithSiblings(value: Json, pointer: string, root: Json, isRoot: boolean): Promise<Json> {
    const ref = value.$ref;
    if (stack.indexOf(ref) !== -1) {
      const anchor = anchors.get(ref);
      const linked = link(ref, anchor ? anchor.pointer : pointer, true);
      return attachSiblings(linked, value, pointer, root, isRoot);
    }
    const resolved = await resolveAgainst(ref, root);
    const merged: Json = {};
    if (resolved.value !== null && typeof resolved.value === "object" && !Array.isArray(resolved.value)) {
      Object.keys(resolved.value).forEach((key) => {
        merged[key] = resolved.value[key];
      });
    }
    Object.keys(value).forEach((key) => {
      if (key !== "$ref" && !(isRoot && isDefinitionContainer(key))) {
        merged[key] = value[key];
      }
    });
    delete merged.$ref;
    if (typeof merged.$ref === "undefined" && isPureRef(resolved.value, false)) {
      return writeRef(resolved.value.$ref, pointer, resolved.root);
    }
    return writeObject(merged, pointer, resolved.root, false, ref);
  }

  async function writeObject(
    value: Json,
    pointer: string,
    root: Json,
    isRoot: boolean,
    provenance?: string,
  ): Promise<Json> {
    const out: Json = {};
    if (provenance) {
      out[FROM] = provenance;
    }
    const keys = Object.keys(value).filter((key) => !(isRoot && isDefinitionContainer(key)));
    for (const key of keys) {
      out[key] = await write(value[key], pointer + "/" + escapeToken(key), root);
    }
    return out;
  }

  function attachSiblings(linked: Json, value: Json, pointer: string, root: Json, isRoot: boolean): Promise<Json> {
    const out = Object.assign({}, linked);
    const keys = Object.keys(value).filter((key) => key !== "$ref" && !(isRoot && isDefinitionContainer(key)));
    return keys.reduce((promise: Promise<Json>, key: string) => {
      return promise.then(async (current) => {
        current[key] = await write(value[key], pointer + "/" + escapeToken(key), root);
        return current;
      });
    }, Promise.resolve(out));
  }

  async function resolveAgainst(ref: string, root: Json): Promise<{ value: Json; root: Json }> {
    if (ref[0] === "#") {
      return { value: getPointer(ref, root), root };
    }
    const hashAt = ref.indexOf("#");
    const url = hashAt === -1 ? ref : ref.slice(0, hashAt);
    const fragment = hashAt === -1 ? "#" : ref.slice(hashAt);
    let document = documents.get(url);
    if (document === undefined) {
      document = await resolveExternal(url);
      documents.set(url, document);
    }
    return {
      value: fragment === "#" ? document : getPointer(fragment, document),
      root: document,
    };
  }
}

export function hasCyclicRefs(schema: Json): boolean {
  if (schema === null || typeof schema !== "object") {
    return false;
  }
  const stack: string[] = [];
  const finished = new Set<string>();

  function walk(value: Json, root: Json): boolean {
    if (value === null || typeof value !== "object") {
      return false;
    }
    if (Array.isArray(value)) {
      return value.some((item) => walk(item, root));
    }
    if (typeof value.$ref === "string" && value.$ref[0] === "#") {
      const ref = value.$ref;
      if (stack.indexOf(ref) !== -1) {
        return true;
      }
      if (finished.has(ref)) {
        return false;
      }
      let target: Json;
      try {
        target = getPointer(ref, root);
      } catch (error) {
        return false;
      }
      stack.push(ref);
      const cyclic = walk(target, root);
      stack.pop();
      finished.add(ref);
      return cyclic;
    }
    return Object.keys(value).some((key) => walk(value[key], root));
  }

  return walk(schema, schema);
}

function link(ref: string, pointer: string, cycle: boolean): Json {
  const out: Json = {};
  out.$ref = pointer;
  out[FROM] = ref;
  if (cycle) {
    out[CYCLE] = true;
  }
  return out;
}

function isPureRef(value: Json, isRoot: boolean): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value) || typeof value.$ref !== "string") {
    return false;
  }
  const keys = Object.keys(value).filter((key) => !(isRoot && isDefinitionContainer(key)));
  return keys.length === 1 && keys[0] === "$ref";
}

function isDefinitionContainer(key: string): boolean {
  return key === "definitions" || key === "components";
}

function escapeToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

function decodeToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function getPointer(pointer: string, root: Json): Json {
  if (pointer === "" || pointer === "#") {
    return root;
  }
  if (pointer.indexOf("#/") !== 0) {
    throw new Error("Unsupported JSON pointer: " + pointer);
  }
  const parts = pointer.slice(2).split("/").map(decodeToken);
  let current = root;
  for (const part of parts) {
    if (current === null || typeof current !== "object") {
      throw new Error("Invalid JSON pointer " + pointer);
    }
    if (Array.isArray(current)) {
      const index = parseInt(part, 10);
      if (String(index) !== part || current[index] === undefined) {
        throw new Error("Invalid JSON pointer " + pointer);
      }
      current = current[index];
    } else if (!Object.prototype.hasOwnProperty.call(current, part)) {
      throw new Error("Invalid JSON pointer " + pointer + ": missing " + part);
    } else {
      current = current[part];
    }
  }
  return current;
}

async function defaultResolveExternal(ref: string): Promise<Json> {
  return referenceResolver.resolve(ref, {});
}
