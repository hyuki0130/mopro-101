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
  assets: ['./assets/circuits/'],
};
