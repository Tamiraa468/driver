const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /\/benchmarks\/.*/,
  /\/security-tests\/.*/,
  /\/analysis\/.*/,
];

config.watchFolders = [
  path.resolve(__dirname, "src"),
  path.resolve(__dirname, "assets"),
  path.resolve(__dirname, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
