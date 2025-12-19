/**
 * @format
 */

// Crypto polyfills - MUST be first before any WalletConnect imports!
import 'react-native-get-random-values';

// WalletConnect polyfills - after crypto polyfills
import '@walletconnect/react-native-compat';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
