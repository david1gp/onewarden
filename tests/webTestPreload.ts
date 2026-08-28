import { transformAsync } from "@babel/core"
import presetTypescript from "@babel/preset-typescript"
// @ts-expect-error - the preset ships no type declarations
import presetSolid from "babel-preset-solid"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { plugin } from "bun"
import { readFile } from "node:fs/promises"

const nativeHeaders = globalThis.Headers
const nativeRequest = globalThis.Request
const nativeResponse = globalThis.Response
GlobalRegistrator.register()
globalThis.Headers = nativeHeaders
globalThis.Request = nativeRequest
globalThis.Response = nativeResponse

plugin({
  name: "solid-tsx",
  setup(build) {
    build.onLoad({ filter: /\.tsx$/ }, async (args) => {
      const source = await readFile(args.path, "utf8")
      const transformed = await transformAsync(source, {
        filename: args.path,
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ["jsx", "typescript"] },
        presets: [[presetSolid, {}], presetTypescript],
      })
      return { contents: transformed?.code ?? source, loader: "js" }
    })
  },
})
