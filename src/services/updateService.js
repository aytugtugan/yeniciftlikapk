import { Platform, NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

// GitHub repo bilgileri
const GITHUB_OWNER = 'aytugtugan';
const GITHUB_REPO = 'yeniciftlikapk';

/**
 * Native Android'den yüklü APK'nın versionCode ve versionName bilgisini alır.
 * Bu sayede hardcoded değer yerine gerçek yüklü sürüm kullanılır.
 */
async function getInstalledVersion() {
  if (Platform.OS !== 'android') {
    return { versionCode: 0, versionName: '0.0.0' };
  }
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
 */
export async function checkForUpdate() {
  const currentVersion = await getCurrentVersion();
  const currentVersionCode = currentVersion.versionCode;
  const currentVersionName = currentVersion.versionName;
  // Latest release yerine tag prefix ile filtreli arama yap
  const allReleasesUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;
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

  // "yeniciftlik-v" ile başlayan en son release'i bul
  const release = releases.find(r => r.tag_name && r.tag_name.startsWith('yeniciftlik-v'));

  if (!release) {
    return { hasUpdate: false };
  }

  // Tag'den versionCode ve versionName çıkar
  // Tag formatı: yeniciftlik-v2  veya  yeniciftlik-v1.1.0
  const tagVersion = release.tag_name.replace('yeniciftlik-v', '');
  // versionCode: body içindeki JSON'dan veya tag'deki sayıdan
  let versionCode = 0;
  let versionName = tagVersion;
  let forceUpdate = false;
  let minVersionCode = 1;
  let releaseNotes = '';

  // Body'den metadata parse etmeye çalış
  try {
    // Body'nin ilk satırında JSON olabilir
    const bodyLines = (release.body || '').split('\n');
    const jsonLine = bodyLines.find(l => l.trim().startsWith('{'));
    if (jsonLine) {
      const meta = JSON.parse(jsonLine);
      if (meta.versionCode) versionCode = meta.versionCode;
      if (meta.forceUpdate) forceUpdate = true;
      if (meta.minVersionCode) minVersionCode = meta.minVersionCode;
    }
    // JSON satırı dışındaki metin releaseNotes
    releaseNotes = bodyLines.filter(l => !l.trim().startsWith('{')).join('\n').trim();
  } catch (_) {
    releaseNotes = release.body || '';
  }

  // versionCode body'de yoksa tag'deki sayıyı kullan
  if (!versionCode) {
    const num = parseInt(tagVersion, 10);
    versionCode = isNaN(num) ? 0 : num;
  }

  // APK asset'ini bul
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
  };
}

/**
 * APK dosyasını indirir ve progress callback döner
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
