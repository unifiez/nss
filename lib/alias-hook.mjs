// Resolve hook that teaches plain `node` the `@/` path alias from tsconfig.json,
// so the verification scripts can import app modules without a bundler.
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd().replace(/\\/g, "/")}/`).href;

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(`${root}${specifier.slice(2)}.ts`, context);
  }
  return nextResolve(specifier, context);
}
