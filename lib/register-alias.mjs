// Registers the `@/` alias resolver for the verification scripts.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./lib/alias-hook.mjs", pathToFileURL(`${process.cwd().replace(/\\/g, "/")}/`));
