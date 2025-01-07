import { defineConfig, Plugin } from "rollup";
import { dts } from "rollup-plugin-dts";
import { createFilter, FilterPattern } from "@rollup/pluginutils";

const IGNORE_ID = "ignore_id";

function ignore(input?: FilterPattern): Plugin {
  const filter = createFilter(input);

  return {
    name: "ignore",
    async resolveId(source) {
      return source === IGNORE_ID ||
        filter(source.startsWith("./") ? source.slice(1) : source)
        ? IGNORE_ID
        : null;
    },
    load(id) {
      return id === IGNORE_ID ? "export default {}" : null;
    },
  };
}

export default defineConfig([
  {
    input: ".declaration-temp/src/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "es" }],
    plugins: [ignore(["**/*.css"]), dts()],
  },
]);
