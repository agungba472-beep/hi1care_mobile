const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAlarmFullScreen(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    const mainActivity = app.activity.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );
    if (mainActivity) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
    }
    return config;
  });
};
