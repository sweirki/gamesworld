const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withAllowNonModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, "utf8");

      const flagLine = 'config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"';

      if (!podfile.includes(flagLine)) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        ${flagLine}
      end
    end`
        );

        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};
