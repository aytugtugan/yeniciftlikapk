#!/bin/bash
# ─────────────────────────────────────────────────────
#  YeniCiftlik APK Dağıtım Scripti (GitHub Releases)
# ─────────────────────────────────────────────────────
#
#  Kullanım:
#    ./deploy-github.sh <versionCode> <versionName> [releaseNotes] [forceUpdate]
#
#  Örnekler:
#    ./deploy-github.sh 2 1.1.0
#    ./deploy-github.sh 3 1.2.0 "Hata düzeltmeleri"
#    ./deploy-github.sh 4 2.0.0 "Büyük güncelleme" true
#

cd "$(dirname "$0")"
PROJECT_ROOT="$(cd .. && pwd)"

VERSION_CODE="$1"
VERSION_NAME="$2"
RELEASE_NOTES="${3:-Güncelleme}"
FORCE_UPDATE="${4:-false}"

if [ -z "$VERSION_CODE" ] || [ -z "$VERSION_NAME" ]; then
    echo ""
    echo "  YeniCiftlik APK Dağıtım (GitHub Releases)"
    echo "  ───────────────────────────────────────────"
    echo ""
    echo "  Kullanım:"
    echo "    ./deploy-github.sh <versionCode> <versionName> [releaseNotes] [forceUpdate]"
    echo ""
    echo "  Örnekler:"
    echo "    ./deploy-github.sh 2 1.1.0"
    echo "    ./deploy-github.sh 3 1.2.0 \"Yeni özellikler\""
    echo "    ./deploy-github.sh 4 2.0.0 \"Kritik güncelleme\" true"
    echo ""
    exit 1
fi

# ─── Kontroller ─────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   YeniCiftlik APK Dağıtım           ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# gh CLI kontrolü
if ! command -v gh &> /dev/null; then
    echo "  ❌ GitHub CLI (gh) bulunamadı!"
    echo "     Kurmak için: brew install gh"
    exit 1
fi

# gh auth kontrolü
if ! gh auth status &> /dev/null; then
    echo "  ❌ GitHub'a giriş yapılmamış!"
    echo "     Giriş için: gh auth login"
    exit 1
fi

echo "  ✓ GitHub CLI hazır"

# ─── APK Build ──────────────────────────────────────
APK_PATH="$PROJECT_ROOT/MobileApp/android/app/build/outputs/apk/release/app-release.apk"

echo ""
echo "  [1/4] updateService.js güncelleniyor..."

# updateService.js içindeki CURRENT_VERSION_CODE ve CURRENT_VERSION_NAME güncelle
SVCFILE="$PROJECT_ROOT/MobileApp/src/services/updateService.js"
if [ -f "$SVCFILE" ]; then
    sed -i '' "s/export const CURRENT_VERSION_CODE = [0-9]*/export const CURRENT_VERSION_CODE = ${VERSION_CODE}/" "$SVCFILE"
    sed -i '' "s/export const CURRENT_VERSION_NAME = '.*'/export const CURRENT_VERSION_NAME = '${VERSION_NAME}'/" "$SVCFILE"
    echo "  ✓ versionCode=$VERSION_CODE, versionName=$VERSION_NAME"
fi

# build.gradle versionCode/versionName güncelle
GRADLE="$PROJECT_ROOT/MobileApp/android/app/build.gradle"
if [ -f "$GRADLE" ]; then
    sed -i '' "s/versionCode [0-9]*/versionCode ${VERSION_CODE}/" "$GRADLE"
    sed -i '' "s/versionName \".*\"/versionName \"${VERSION_NAME}\"/" "$GRADLE"
    echo "  ✓ build.gradle güncellendi"
fi

echo ""
echo "  [2/4] APK build ediliyor..."
echo "         (Bu birkaç dakika sürebilir)"
echo ""

cd "$PROJECT_ROOT/MobileApp/android"
./gradlew assembleRelease --console=plain -q 2>&1

if [ $? -ne 0 ]; then
    echo "  ❌ APK build başarısız!"
    exit 1
fi

if [ ! -f "$APK_PATH" ]; then
    echo "  ❌ APK dosyası bulunamadı: $APK_PATH"
    exit 1
fi

APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo "  ✓ APK hazır ($APK_SIZE)"

# ─── GitHub Release ─────────────────────────────────
echo ""
echo "  [3/4] GitHub Release oluşturuluyor..."

TAG="yeniciftlik-v${VERSION_CODE}"
TITLE="YeniCiftlik v${VERSION_NAME}"

# Release body: metadata JSON + release notes
BODY_TEXT="${RELEASE_NOTES}"
if [ "$FORCE_UPDATE" = "true" ]; then
    BODY_TEXT="{\"versionCode\":${VERSION_CODE},\"forceUpdate\":true,\"minVersionCode\":${VERSION_CODE}}
${RELEASE_NOTES}"
else
    BODY_TEXT="{\"versionCode\":${VERSION_CODE},\"forceUpdate\":false,\"minVersionCode\":1}
${RELEASE_NOTES}"
fi

cd "$PROJECT_ROOT"

# Eğer aynı tag varsa sil
gh release delete "$TAG" --repo aytugtugan/yeniciftlikapk --yes 2>/dev/null

gh release create "$TAG" \
    --repo aytugtugan/yeniciftlikapk \
    --title "$TITLE" \
    --notes "$BODY_TEXT" \
    "$APK_PATH#YeniCiftlik-v${VERSION_NAME}.apk"

if [ $? -ne 0 ]; then
    echo "  ❌ GitHub Release oluşturulamadı!"
    exit 1
fi

echo "  ✓ Release oluşturuldu: $TAG"

# ─── Git commit & push ──────────────────────────────
echo ""
echo "  [4/4] Değişiklikler commit ediliyor..."

cd "$PROJECT_ROOT"
git add MobileApp/src/services/updateService.js MobileApp/android/app/build.gradle
git commit -m "release: YeniCiftlik v${VERSION_NAME} (code: ${VERSION_CODE})" --quiet 2>/dev/null
git push --quiet 2>/dev/null

echo "  ✓ Git push tamamlandı"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   ✅ Dağıtım Tamamlandı!            ║"
echo "  ╠══════════════════════════════════════╣"
echo "  ║   Sürüm: v${VERSION_NAME} (code: ${VERSION_CODE})"
echo "  ║   Boyut: ${APK_SIZE}"
echo "  ║   Force: ${FORCE_UPDATE}"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  Telefonlar uygulamayı açtığında"
echo "  güncelleme bildirimi görecek."
echo ""
