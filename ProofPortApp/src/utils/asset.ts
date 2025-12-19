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

/**
 * Pre-load circuit assets for Android
 * This ensures large files (especially SRS) are copied before proof generation
 * Call this early to avoid first-run crashes due to async file copy timing issues
 */
export const preloadCircuitAssets = async (
  circuitName: string,
  addLog?: (msg: string) => void,
): Promise<{circuitPath: string; srsPath: string}> => {
  const log = addLog || console.log;

  log(`Preloading circuit assets for ${circuitName}...`);

  // Get paths (this triggers file copy on Android)
  const circuitPath = await getAssetPath(`${circuitName}.json`);
  const srsPath = await getAssetPath(`${circuitName}.srs`);

  // Verify files exist and are readable
  if (Platform.OS === 'android') {
    const circuitExists = await RNFS.exists(circuitPath);
    const srsExists = await RNFS.exists(srsPath);

    if (!circuitExists) {
      throw new Error(`Circuit file not found: ${circuitPath}`);
    }
    if (!srsExists) {
      throw new Error(`SRS file not found: ${srsPath}`);
    }

    // Get file sizes to ensure they're fully copied
    const circuitStat = await RNFS.stat(circuitPath);
    const srsStat = await RNFS.stat(srsPath);

    log(`Circuit file: ${(circuitStat.size / 1024).toFixed(1)} KB`);
    log(`SRS file: ${(srsStat.size / (1024 * 1024)).toFixed(1)} MB`);
  }

  log('Circuit assets ready');
  return {circuitPath, srsPath};
};

/**
 * Clear mopro-ffi polynomial cache files (poly-mmap-*)
 * These files are created during proof generation and can accumulate to GB size
 */
export const clearProofCache = async (
  addLog?: (msg: string) => void,
): Promise<{cleared: number; bytes: number}> => {
  const log = addLog || console.log;
  let clearedCount = 0;
  let clearedBytes = 0;

  try {
    const cachePath = RNFS.CachesDirectoryPath;
    const files = await RNFS.readDir(cachePath);

    for (const file of files) {
      // Match poly-mmap-* files (mopro-ffi cache)
      if (file.name.startsWith('poly-mmap-')) {
        try {
          clearedBytes += file.size;
          await RNFS.unlink(file.path);
          clearedCount++;
        } catch {
          // Ignore errors for individual files
        }
      }
    }

    const mbCleared = (clearedBytes / (1024 * 1024)).toFixed(2);
    log(`Cleared ${clearedCount} cache files (${mbCleared} MB)`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Cache clear error: ${errorMsg}`);
  }

  return {cleared: clearedCount, bytes: clearedBytes};
};

/**
 * Get current cache size
 */
export const getCacheSize = async (): Promise<{files: number; bytes: number}> => {
  let totalFiles = 0;
  let totalBytes = 0;

  try {
    const cachePath = RNFS.CachesDirectoryPath;
    const files = await RNFS.readDir(cachePath);

    for (const file of files) {
      if (file.name.startsWith('poly-mmap-')) {
        totalFiles++;
        totalBytes += file.size;
      }
    }
  } catch {
    // Ignore errors
  }

  return {files: totalFiles, bytes: totalBytes};
};

/**
 * Get available storage space on device
 */
export const getAvailableStorage = async (): Promise<{
  free: number;
  total: number;
  freeGB: string;
}> => {
  try {
    const info = await RNFS.getFSInfo();
    return {
      free: info.freeSpace,
      total: info.totalSpace,
      freeGB: (info.freeSpace / (1024 * 1024 * 1024)).toFixed(2),
    };
  } catch {
    return {free: 0, total: 0, freeGB: '0'};
  }
};

/**
 * Aggressive cache clear - clears ALL cache directories
 * Use this when storage is critically low
 */
export const clearAllCache = async (
  addLog?: (msg: string) => void,
): Promise<{cleared: number; bytes: number}> => {
  const log = addLog || console.log;
  let clearedCount = 0;
  let clearedBytes = 0;

  const dirsToClean = [
    RNFS.CachesDirectoryPath,
    RNFS.TemporaryDirectoryPath,
  ];

  for (const dirPath of dirsToClean) {
    try {
      const files = await RNFS.readDir(dirPath);

      for (const file of files) {
        // Clear poly-mmap files and other temp files
        if (
          file.name.startsWith('poly-mmap-') ||
          file.name.startsWith('tmp') ||
          file.name.endsWith('.tmp')
        ) {
          try {
            clearedBytes += file.size;
            await RNFS.unlink(file.path);
            clearedCount++;
          } catch {
            // Ignore individual file errors
          }
        }
      }
    } catch {
      // Ignore directory errors
    }
  }

  const mbCleared = (clearedBytes / (1024 * 1024)).toFixed(2);
  log(`Aggressively cleared ${clearedCount} files (${mbCleared} MB)`);

  return {cleared: clearedCount, bytes: clearedBytes};
};

/**
 * Ensure minimum storage is available before proof generation
 * Returns true if enough space, false otherwise
 */
export const ensureStorageAvailable = async (
  minMB: number = 500,
  addLog?: (msg: string) => void,
): Promise<boolean> => {
  const log = addLog || console.log;

  const storage = await getAvailableStorage();
  const freeMB = storage.free / (1024 * 1024);

  log(`Available storage: ${storage.freeGB} GB (${freeMB.toFixed(0)} MB)`);

  if (freeMB < minMB) {
    log(`Storage low! Clearing all cache...`);
    await clearAllCache(log);

    // Check again after clearing
    const newStorage = await getAvailableStorage();
    const newFreeMB = newStorage.free / (1024 * 1024);
    log(`After cleanup: ${newStorage.freeGB} GB (${newFreeMB.toFixed(0)} MB)`);

    if (newFreeMB < minMB) {
      log(`ERROR: Still insufficient storage (need ${minMB} MB)`);
      return false;
    }
  }

  return true;
};
