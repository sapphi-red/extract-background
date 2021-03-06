// https://github.com/facebook/create-react-app/issues/3660#issuecomment-524567034
const fs = require("fs")
const path = require("path")
const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = relativePath => path.resolve(appDirectory, relativePath)
const getCacheIdentifier = require("react-dev-utils/getCacheIdentifier")

const isEnvDevelopment = process.env.NODE_ENV === "development"
const isEnvProduction = process.env.NODE_ENV === "production"

module.exports = function override(config, env) {
  // worker ------------
  config.module.rules[2].oneOf.splice(1, 0, {
    test: /\.worker\.(js|jsx|mjs|ts|tsx)$/,
    include: resolveApp("src"),
    use: [
      {
        loader: require.resolve("worker-loader"),
        options: {
          inline: false
        }
      },
      {
        loader: require.resolve("babel-loader"),
        options: {
          customize: require.resolve(
            "babel-preset-react-app/webpack-overrides"
          ),
          babelrc: false,
          configFile: false,
          presets: [require.resolve("babel-preset-react-app")],
          // Make sure we have a unique cache identifier, erring on the
          // side of caution.
          // We remove this when the user ejects because the default
          // is sane and uses Babel options. Instead of options, we use
          // the react-scripts and babel-preset-react-app versions.
          cacheIdentifier: getCacheIdentifier(
            isEnvProduction ? "production" : isEnvDevelopment && "development",
            [
              "babel-plugin-named-asset-import",
              "babel-preset-react-app",
              "react-dev-utils",
              "react-scripts"
            ]
          ),
          plugins: [
            [
              require.resolve("babel-plugin-named-asset-import"),
              {
                loaderMap: {
                  svg: {
                    ReactComponent: "@svgr/webpack?-prettier,-svgo![path]"
                  }
                }
              }
            ]
          ],
          // This is a feature of `babel-loader` for webpack (not Babel itself).
          // It enables caching results in ./node_modules/.cache/babel-loader/
          // directory for faster rebuilds.
          cacheDirectory: true,
          cacheCompression: isEnvProduction,
          compact: false
        }
      }
    ]
  })
  config.output["globalObject"] = "self"

  // wasm -----------------
  const wasmExt = /\.wasm$/i
  const fileLoaderRuleIndex = config.module.rules[2].oneOf.findIndex(
    r => r.loader && r.loader.includes("file-loader")
  )
  config.module.rules[2].oneOf[fileLoaderRuleIndex].exclude.push(wasmExt)
  config.module.rules.push({
    test: wasmExt,
    type: "javascript/auto",
    loader: "file-loader"
  })

  return config
}
