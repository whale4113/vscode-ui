import { defineConfig, Plugin } from "rollup";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";

interface RollupCssOptions {}

function css(options: RollupCssOptions = {}): Plugin {
  const {} = options;

  let emittedCSS = new Map<
    string,
    {
      merber: string;
      code: string;
    }
  >();

  return {
    name: "css",

    async resolveId(source, importer, options) {
      if (!source.endsWith(".css")) return null;

      const resolveId = await this.resolve(source, importer, options);

      if (resolveId && importer && !emittedCSS.has(resolveId.id)) {
        emittedCSS.set(resolveId.id, {
          merber: path.parse(source).name,
          code: "",
        });
      }

      return resolveId;
    },
    async transform(code, id) {
      if (!id.endsWith(".css")) return null;

      if (emittedCSS.has(id)) {
        const css = emittedCSS.get(id)!;
        css.code = code;
      }

      return {
        code: "export default {}",
      };
    },

    async generateBundle() {
      for (const [, css] of emittedCSS) {
        this.emitFile({
          type: "asset",
          fileName: `${css.merber}/index.css`,
          source: css.code,
        });
      }
      emittedCSS.clear();
    },
  };
}

export default defineConfig([
  {
    input: "src/index.ts",
    output: {
      dir: "dist",
      format: "esm",
    },
    plugins: [
      typescript({
        tsconfig: "tsconfig.build.json",
        compilerOptions: {
          declaration: false,
          declarationDir: undefined,
        },
      }),
      css(),
    ],
  },
]);
