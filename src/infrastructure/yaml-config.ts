import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import type { z } from "zod";

/** Reads a YAML file and validates it at the boundary, naming every invalid field. */
export async function loadYaml<Schema extends z.ZodType>(root: string, file: string, schema: Schema): Promise<z.infer<Schema>> {
  const result = schema.safeParse(parse(await readFile(join(root, file), "utf8")));
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");
    throw new Error(`${file} is invalid:\n${issues}`);
  }
  return result.data;
}
