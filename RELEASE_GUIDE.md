# YeniCiftlik Release APK Guide

## Overview
This guide explains how to build and release new versions of the YeniCiftlik mobile app for tablet deployment.

## Prerequisites
- Node.js >= 22.11.0
- Android SDK installed and configured
- Java JDK 11 or higher
- Git (for version control)

## Release Process

### Step 1: Prepare Release Version

1. **Update version numbers** in `android/app/build.gradle`:
   ```gradle
   versionCode = X  // Increment this for each release
   versionName = "X.X.X"  // Follow semantic versioning
   ```

2. **Update app/build.gradle** with release signing config:
   ```gradle
   signingConfigs {
       release {
           storeFile file('path/to/keystore.jks')
           storePassword 'password'
           keyAlias 'alias'
           keyPassword 'password'
       }
   }
   ```

3. **Commit changes**:
   ```bash
   git add -A
   git commit -m "Release version X.X.X"
   git tag -a vX.X.X -m "Release version X.X.X"
   ```

### Step 2: Build Release APK

Use the provided build script:

```bash
# Make script executable (first time only)
chmod +x build-release-apk.sh

# Build release APK
./build-release-apk.sh 1  # version code

# Example with v1.2.3
./build-releaseapk.sh 123
```

The script will:
- Clean previous builds
- Install dependencies
- Build optimized release APK
- Copy to `builds/` directory

### Step 3: Upload to yeniciftlikapk Repository

1. **Clone yeniciftlikapk repository**:
   ```bash
   git clone <yeniciftlikapk-repo-url>
   cd yeniciftlikapk
   ```

2. **Create release directory structure**:
   ```bash
   mkdir -p releases/v1.X.X
   ```

3. **Copy APK to repository**:
   ```bash
   cp ../YeniCiftlik/MobileApp/builds/yeniciftlik-vX.X.X-*.apk releases/v1.X.X/
   ```

4. **Update version manifest** (`releases/version.json`):
   ```json
   {
     "currentVersion": "1.X.X",
     "versionCode": XXX,
     "releaseDate": "2026-04-03",
     "apkUrl": "https://yeniciftlikapk.example.com/releases/v1.X.X/yeniciftlik-v1.X.X.apk",
     "releaseNotes": "- Feature 1\n- Feature 2\n- Bug fixes",
     "minVersionCode": 1,
     "forceUpdate": false
   }
   ```

5. **Commit and push**:
   ```bash
   git add releases/v1.X.X/
   git add releases/version.json
   git commit -m "Release v1.X.X"
   git push origin main
   ```

### Step 4: Test on Tablets

1. **Download APK to tablet** from yeniciftlikapk repository
2. **Install APK**:
   ```bash
   adb install releases/v1.X.X/*.apk
   ```
3. **Test critical features**:
   - Quality control form scanning
   - Arıza Kayıtları creation and resolution
   - Production tracking
   - Report generation
4. **Verify update detection** in-app

### Step 5: Post-Release

1. **Monitor logs** for any crash reports
2. **Collect user feedback** from tablet users
3. **Track issues** in project management system
4. **Plan next release** based on feedback

## Manual APK Build (Alternative)

If you prefer to build manually without the script:

```bash
# From MobileApp directory
cd YeniCiftlik/MobileApp

# Build release APK
npx react-native run-android --mode Release

# Or use Android Studio
# Open android/ folder in Android Studio
# Build > Build Bundle(s)/APK(s) > Build APK(s)
```

The compiled APK will be in:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Version Control Strategy

### Semantic Versioning
- **MAJOR** (1.X.X): Breaking changes or significant features
- **MINOR** (X.1.X): New features, backward compatible
- **PATCH** (X.X.1): Bug fixes

### Example Releases
- v1.0.0 - Initial release
- v1.1.0 - Added Arıza Kayıtları feature
- v1.1.1 - Bug fix for validation modal
- v1.2.0 - Enhanced quality control validation

## Deployment Checklist

- [ ] Version numbers updated
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Release notes prepared
- [ ] APK built and tested locally
- [ ] Git tag created
- [ ] yeniciftlikapk repository updated
- [ ] version.json manifest updated
- [ ] Tablets updated with new APK
- [ ] User feedback collected
- [ ] Release documented

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm install
npm run android -- --mode Release
```

### Keystore Issues
- Ensure keystore file path is correct
- Verify keystore password and key alias
- Check Java version compatibility

### Upload Issues
- Verify GitHub credentials
- Check repository permissions
- Ensure file paths are correct

## Support

For issues or questions:
1. Check build logs for specific errors
2. Review Android Gradle documentation
3. Consult React Native deployment guide
4. Contact development team

## Resources

- [React Native Android Build Docs](https://reactnative.dev/docs/signed-apk-android)
- [Android Studio Build Guide](https://developer.android.com/studio/build)
- [Semantic Versioning](https://semver.org/)
