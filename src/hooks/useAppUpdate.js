import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { checkForUpdate, downloadApk, installApk } from '../services/updateService';

const MAX_RETRIES = 3;

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Güncelleme kontrolü
  const check = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      setError(null);
      const info = await checkForUpdate();
      if (info.hasUpdate) {
        setUpdateInfo(info);
        setDismissed(false);
      } else {
        setUpdateInfo(null);
      }
    } catch (err) {
      console.warn('Güncelleme kontrolü başarısız:', err.message);
    }
  }, []);

  // Uygulama açıldığında kontrol et
  useEffect(() => {
    check();
  }, [check]);

  // İndirme ve kurulumu başlat
  const startUpdate = useCallback(async () => {
    if (!updateInfo?.apkUrl) return;

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        setDownloading(true);
        setInstalling(false);
        setProgress(0);
        setError(null);

        const apkPath = await downloadApk(updateInfo.apkUrl, (percent) => {
          setProgress(percent);
        });

        setProgress(100);
        setDownloading(false);
        setInstalling(true);

        await installApk(apkPath);

        // installApk Android kurulum ekranını açar ve hemen resolve olur.
        // Kullanıcı kurulumu tamamlayınca uygulama yeniden başlar.
        // Dialogu kapatalım ki kullanıcı beklemede kalmasın.
        setInstalling(false);
        setDismissed(true);
        return;
      } catch (err) {
        lastError = err;
        setInstalling(false);

        if (err.message === 'UNKNOWN_SOURCES_REQUIRED') {
          setError('Bilinmeyen kaynaklardan yükleme izni gerekli. Ayarlardan izin verdikten sonra tekrar deneyin.');
          setDownloading(false);
          return;
        }

        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    setError(lastError?.message || 'Güncelleme başarısız. Lütfen tekrar deneyin.');
    setDownloading(false);
  }, [updateInfo]);

  // Kullanıcı dialogu kapatırsa
  const dismiss = useCallback(() => {
    if (updateInfo?.isForceUpdate) return;
    setDismissed(true);
  }, [updateInfo]);

  // Tekrar dene
  const retry = useCallback(() => {
    setError(null);
    startUpdate();
  }, [startUpdate]);

  return {
    updateInfo,
    downloading,
    installing,
    progress,
    error,
    dismissed,
    showDialog: !!updateInfo && !dismissed,
    startUpdate,
    dismiss,
    retry,
    checkAgain: check,
  };
}
