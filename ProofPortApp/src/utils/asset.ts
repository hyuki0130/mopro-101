import {Platform} from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Get the path to bundled assets based on platform
 * iOS: Assets are in MainBundlePath
 * Android: Assets need to be copied from assets folder to DocumentDirectory
 */
export const getAssetPath = async (filename: string): Promise<string> => {
  if (Platform.OS === 'ios') {
    return `${RNFS.MainBundlePath}/${filename}`;
  }

  // For Android, copy from assets to document directory
  const destPath = `${RNFS.DocumentDirectoryPath}/${filename}`;
  const exists = await RNFS.exists(destPath);

  if (!exists) {
    await RNFS.copyFileAssets(`circuits/${filename}`, destPath);
  }

  return destPath;
};
