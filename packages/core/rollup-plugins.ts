import { Plugin } from "rollup";
import { createFilter, FilterPattern } from "@rollup/pluginutils";
import path from "node:path";

const IGNORE_ID = "ignore_id";

export function ignore(input?: FilterPattern): Plugin {
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

interface RollupCssOptions {}

export function css(options: RollupCssOptions = {}): Plugin {
  const {} = options;

  let emittedCSS = new Map<
    string,
    {
      member: string;
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
          member: path.parse(source).name,
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
          name: css.member,
          source: css.code,
          type: "asset",
        });
      }
      emittedCSS.clear();
    },
  };
}
