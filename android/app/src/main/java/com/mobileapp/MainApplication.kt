package com.mobileapp

import android.app.Application
import android.content.Context
import android.content.res.Configuration
import java.util.Locale
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(ApkInstallerPackage())
        },
    )
  }

  override fun attachBaseContext(base: Context) {
    super.attachBaseContext(applyTurkishLocale(base))
  }

  override fun onCreate() {
    super.onCreate()
    forceLatinDigits()
    loadReactNative(this)
  }

  private fun applyTurkishLocale(context: Context): Context {
    val locale = Locale("tr", "TR")
    Locale.setDefault(locale)
    val config = Configuration(context.resources.configuration)
    config.setLocale(locale)
    return context.createConfigurationContext(config)
  }

  private fun forceLatinDigits() {
    val locale = Locale("tr", "TR")
    Locale.setDefault(locale)
    val config = Configuration(resources.configuration)
    config.setLocale(locale)
    @Suppress("DEPRECATION")
    resources.updateConfiguration(config, resources.displayMetrics)
  }
}
