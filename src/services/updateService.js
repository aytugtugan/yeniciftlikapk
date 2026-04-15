import { Platform, NativeModules, Linking } from 'react-native';
import RNFS from 'react-native-fs';

// Yerel güncelleme sunucusu (fabrika ağı)
const UPDATE_SERVER_URL = 'http://10.35.20.17:3002';

// GitHub repo bilgileri (fallback)
const GITHUB_OWNER = 'aytugtugan';
const GITHUB_REPO_ANDROID = 'yeniciftlikapk';
const GITHUB_REPO_IOS = 'yeniciftlikapk'; // iOS release'leri de aynı repo'dan

/**
 * Native Android'den yüklü APK'nın versionCode ve versionName bilgisini alır.
 * iOS'ta Info.plist'ten CFBundleVersion okunur.
 */
async function getInstalledVersion() {
  if (Platform.OS === 'ios') {
    try {
      const { RNDeviceInfo } = NativeModules;
      if (RNDeviceInfo?.getBuildNumber) {
        const buildNumber = await RNDeviceInfo.getBuildNumber();
        const version = await RNDeviceInfo.getVersion();
        return { versionCode: parseInt(buildNumber, 10) || 1, versionName: version || '1.0.0' };
      }
    } catch (_) {}
    // Fallback: react-native'in PlatformConstants'ından oku
    try {
      const constants = NativeModules.PlatformConstants || {};
      return {
        versionCode: parseInt(constants.osVersion, 10) || 1,
        versionName: '1.0.0',
      };
    } catch (_) {}
    return { versionCode: 1, versionName: '1.0.0' };
  }
  if (Platform.OS === 'android') {
    try {
      const { ApkInstaller } = NativeModules;
      if (ApkInstaller?.getVersionInfo) {
        const info = await ApkInstaller.getVersionInfo();
        return {
          versionCode: info.versionCode || 0,
          versionName: info.versionName || '1.0.0',
        };
      }
    } catch (_) {}
  }
  // Fallback
  return { versionCode: 1, versionName: '1.0.0' };
}

// Cache: native çağrıyı tekrar tekrar yapmamak için
let _cachedVersion = null;

export async function getCurrentVersion() {
  if (!_cachedVersion) {
    _cachedVersion = await getInstalledVersion();
  }
  return _cachedVersion;
}

/**
 * GitHub Releases'den güncel sürüm bilgisini kontrol eder.
 * iOS ve Android için aynı repo'dan farklı tag prefix'leri kullanır.
 */
export async function checkForUpdate() {
  const currentVersion = await getCurrentVersion();
  const currentVersionCode = currentVersion.versionCode;
  const currentVersionName = currentVersion.versionName;

  // 1) Önce yerel güncelleme sunucusunu dene (fabrika ağı)
  try {
    const result = await checkFromLocalServer(currentVersionCode, currentVersionName);
    if (result) return result;
  } catch (err) {
    console.warn('Yerel sunucu kontrolü başarısız, GitHub denenecek:', err.message);
  }

  // 2) Fallback: GitHub Releases API
  return checkFromGitHub(currentVersionCode, currentVersionName);
}

/**
 * Yerel güncelleme sunucusundan (10.35.20.17:3002) sürüm kontrolü yapar.
 */
async function checkFromLocalServer(currentVersionCode, currentVersionName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${UPDATE_SERVER_URL}/api/update/check`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.versionCode) return null;

    const hasUpdate = data.versionCode > currentVersionCode;
    const isForceUpdate = hasUpdate && (
      data.forceUpdate ||
      (data.minVersionCode && currentVersionCode < data.minVersionCode)
    );

    return {
      hasUpdate,
      isForceUpdate,
      currentVersionCode,
      currentVersionName,
      serverVersionCode: data.versionCode,
      serverVersionName: data.versionName,
      apkUrl: data.apkUrl,
      releaseNotes: data.releaseNotes || '',
      platform: Platform.OS,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GitHub Releases API'den sürüm kontrolü yapar (fallback).
 */
async function checkFromGitHub(currentVersionCode, currentVersionName) {
  const repoName = Platform.OS === 'ios' ? GITHUB_REPO_IOS : GITHUB_REPO_ANDROID;
  const tagPrefix = Platform.OS === 'ios' ? 'yeniciftlik-ios-v' : 'yeniciftlik-v';

  const allReleasesUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${repoName}/releases`;
  const response = await fetch(allReleasesUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API hatası: ${response.status}`);
  }

  const releases = await response.json();

  // Platform'a göre release'leri filtrele
  const filteredReleases = releases.filter(r => r.tag_name && r.tag_name.startsWith(tagPrefix));

  if (filteredReleases.length === 0) {
    return { hasUpdate: false };
  }

  // En yüksek versionCode'lu release'i bul
  const release = filteredReleases.reduce((best, r) => {
    const num = parseInt(r.tag_name.replace(tagPrefix, ''), 10);
    const bestNum = parseInt(best.tag_name.replace(tagPrefix, ''), 10);
    return (!isNaN(num) && num > bestNum) ? r : best;
  }, filteredReleases[0]);

  const tagVersion = release.tag_name.replace(tagPrefix, '');
  let versionCode = 0;
  let versionName = tagVersion;
  let forceUpdate = false;
  let minVersionCode = 1;
  let releaseNotes = '';

  // Body'den metadata parse etmeye çalış
  try {
    const bodyLines = (release.body || '').split('\n');
    const jsonLine = bodyLines.find(l => l.trim().startsWith('{'));
    if (jsonLine) {
      const meta = JSON.parse(jsonLine);
      if (meta.versionCode) versionCode = meta.versionCode;
      if (meta.forceUpdate) forceUpdate = true;
      if (meta.minVersionCode) minVersionCode = meta.minVersionCode;
    }
    releaseNotes = bodyLines.filter(l => !l.trim().startsWith('{')).join('\n').trim();
  } catch (_) {
    releaseNotes = release.body || '';
  }

  if (!versionCode) {
    const num = parseInt(tagVersion, 10);
    versionCode = isNaN(num) ? 0 : num;
  }

  if (Platform.OS === 'ios') {
    // iOS: manifest.plist asset'ini bul
    const manifestAsset = (release.assets || []).find(
      a => a.name === 'manifest.plist',
    );
    const ipaAsset = (release.assets || []).find(
      a => a.name && a.name.toLowerCase().endsWith('.ipa'),
    );

    if (!manifestAsset && !ipaAsset) {
      return { hasUpdate: false };
    }

    const hasUpdate = versionCode > currentVersionCode;
    const isForceUpdate = hasUpdate && (
      forceUpdate ||
      (minVersionCode && currentVersionCode < minVersionCode)
    );

    return {
      hasUpdate,
      isForceUpdate,
      currentVersionCode,
      currentVersionName,
      serverVersionCode: versionCode,
      serverVersionName: versionName || release.name || tagVersion,
      manifestUrl: manifestAsset?.browser_download_url || null,
      releaseNotes,
      platform: 'ios',
    };
  }

  // Android: APK asset'ini bul
  const apkAsset = (release.assets || []).find(
    a => a.name && a.name.toLowerCase().endsWith('.apk'),
  );

  if (!apkAsset) {
    return { hasUpdate: false };
  }

  const hasUpdate = versionCode > currentVersionCode;
  const isForceUpdate = hasUpdate && (
    forceUpdate ||
    (minVersionCode && currentVersionCode < minVersionCode)
  );

  return {
    hasUpdate,
    isForceUpdate,
    currentVersionCode,
    currentVersionName,
    serverVersionCode: versionCode,
    serverVersionName: versionName || release.name || tagVersion,
    apkUrl: apkAsset.browser_download_url,
    releaseNotes,
    platform: 'android',
  };
}

/**
 * APK dosyasını indirir ve progress callback döner (Android)
 * @param {string} apkUrl - APK indirme URL'i
 * @param {function} onProgress - (percent: number) => void
 * @returns {Promise<string>} - İndirilen dosyanın yolu
 */
export async function downloadApk(apkUrl, onProgress) {
  if (Platform.OS !== 'android') {
    throw new Error('APK kurulumu sadece Android için desteklenir');
  }

  const destPath = `${RNFS.CachesDirectoryPath}/YeniCiftlik-update.apk`;

  // Eski dosya varsa sil
  const exists = await RNFS.exists(destPath);
  if (exists) {
    await RNFS.unlink(destPath);
  }

  const downloadResult = RNFS.downloadFile({
    fromUrl: apkUrl,
    toFile: destPath,
    progress: (res) => {
      if (onProgress && res.contentLength > 0) {
        const percent = Math.round((res.bytesWritten / res.contentLength) * 100);
        onProgress(percent);
      }
    },
    progressInterval: 250,
    progressDivider: 1,
  });

  const result = await downloadResult.promise;

  if (result.statusCode !== 200) {
    throw new Error(`APK indirme başarısız: HTTP ${result.statusCode}`);
  }

  // Dosya boyutu kontrolü
  const fileInfo = await RNFS.stat(destPath);
  if (fileInfo.size < 1024) {
    throw new Error('İndirilen dosya çok küçük, geçersiz APK');
  }

  return destPath;
}

/**
 * iOS OTA güncelleme: itms-services:// protokolü ile manifest.plist üzerinden kurulum başlatır
 * @param {string} manifestUrl - manifest.plist dosyasının URL'i
 */
export async function installIOSUpdate(manifestUrl) {
  if (Platform.OS !== 'ios') {
    throw new Error('iOS güncelleme sadece iOS için desteklenir');
  }

  const itmsUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;

  const canOpen = await Linking.canOpenURL(itmsUrl);
  if (!canOpen) {
    throw new Error('itms-services protokolü açılamıyor. Lütfen Safari üzerinden deneyin.');
  }

  await Linking.openURL(itmsUrl);
}

/**
 * İndirilen APK'yı kurar (Android native module kullanır)
 * @param {string} apkPath - APK dosya yolu
 */
export async function installApk(apkPath) {
  if (Platform.OS !== 'android') {
    throw new Error('APK kurulumu sadece Android için desteklenir');
  }

  const { ApkInstaller } = NativeModules;

  if (!ApkInstaller) {
    throw new Error('ApkInstaller native modülü bulunamadı');
  }

  // Bilinmeyen kaynaklar izni kontrolü (Android 8+)
  const canInstall = await ApkInstaller.canInstallFromUnknownSources();
  if (!canInstall) {
    await ApkInstaller.openUnknownSourcesSettings();
    throw new Error('UNKNOWN_SOURCES_REQUIRED');
  }

  return ApkInstaller.install(apkPath);
}
