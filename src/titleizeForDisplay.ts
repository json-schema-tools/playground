import Dereferencer from "@json-schema-tools/dereferencer";
import titleizer from "@json-schema-tools/titleizer";
import { hasCyclicRefs } from "./dereferenceForDisplay";

type Json = any;

/**
 * Print a schema with deterministic titles generated for the schema and
 * every subschema that lacks one.
 *
 * Any $refs are dereferenced first, so the caller does not need to
 * dereference by hand. A circular $ref cannot be inlined and is rejected
 * with an error instead of hanging the dereferencer.
 */
export async function titleizeForDisplay(schema: Json): Promise<string> {
  if (schema === null || typeof schema !== "object") {
    return JSON.stringify(schema, null, 2);
  }
  if (hasCyclicRefs(schema)) {
    throw new Error(
      "This schema contains a circular $ref, which cannot be inlined. " +
      "Dereference shows that cycle as a link instead.",
    );
  }
  const dereferenced = await new Dereferencer(schema).resolve();
  return JSON.stringify(titleizer(dereferenced), null, 2);
}
