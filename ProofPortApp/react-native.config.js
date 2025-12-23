const path = require('path');
const pkg = require('./mopro_bindings/package.json');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  dependencies: {
    [pkg.name]: {
      root: path.join(__dirname, 'mopro_bindings'),
      platforms: {
        ios: {},
        android: {},
      },
    },
  },
  // Circuit assets are now downloaded at runtime from GitHub
  // to reduce bundle size. See src/utils/circuitDownload.ts
  assets: [],
};
