package com.mobileapp

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File

class ApkInstallerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ApkInstaller"

    @ReactMethod
    fun getVersionInfo(promise: Promise) {
        try {
            val context = reactApplicationContext
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val map = Arguments.createMap()
            map.putDouble("versionCode", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode.toDouble()
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toDouble()
            })
            map.putString("versionName", pInfo.versionName ?: "1.0.0")
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("VERSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun install(filePath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val file = File(filePath)

            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "APK dosyası bulunamadı: $filePath")
                return
            }

            val intent = Intent(Intent.ACTION_VIEW)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val uri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    file
                )
                intent.setDataAndType(uri, "application/vnd.android.package-archive")
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } else {
                intent.setDataAndType(
                    Uri.fromFile(file),
                    "application/vnd.android.package-archive"
                )
            }

            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INSTALL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun canInstallFromUnknownSources(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val canInstall = reactApplicationContext.packageManager
                    .canRequestPackageInstalls()
                promise.resolve(canInstall)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openUnknownSourcesSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message, e)
        }
    }
}
