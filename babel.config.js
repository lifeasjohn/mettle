module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved its worklet transform into react-native-worklets.
    // expo-router lists reanimated as a required peer, so this must be last.
    plugins: ['react-native-worklets/plugin'],
  };
};
