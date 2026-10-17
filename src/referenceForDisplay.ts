import referencer from "@json-schema-tools/referencer";

type Json = any;

/**
 * Print a schema with its subschemas extracted into definitions as $refs
 * (the opposite of dereferencing).
 *
 * Every subschema must have a title for its definition name; a NoTitleError
 * is thrown otherwise.
 */
export function referenceForDisplay(schema: Json): string {
  if (schema === null || typeof schema !== "object") {
    return JSON.stringify(schema, null, 2);
  }
  return JSON.stringify(referencer(schema), null, 2);
}
