package com.googlenav

import android.app.Application
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.module.annotations.ReactModule
import com.google.android.libraries.navigation.NavigationApi

@ReactModule(name = GoogleNavModule.NAME)
class GoogleNavModule(reactContext: ReactApplicationContext) :
  NativeGoogleNavModuleSpec(reactContext) {

  override fun getName(): String = NAME

  // Android: API key is declared in AndroidManifest.xml via the Expo config plugin.
  // Accept this call for cross-platform API parity.
  override fun initializeNavigation(apiKey: String, promise: Promise) {
    promise.resolve(true)
  }

  override fun showTermsAndConditions(title: String, companyName: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: run {
      promise.reject("NO_ACTIVITY", "No current activity available")
      return
    }
    reactApplicationContext.runOnUiQueueThread {
      // Signature: (Activity, companyName, title, OnTermsResponseListener)
      NavigationApi.showTermsAndConditionsDialog(
        activity,
        companyName,
        title,
        NavigationApi.OnTermsResponseListener { accepted ->
          promise.resolve(accepted)
        }
      )
    }
  }

  override fun areTermsAccepted(promise: Promise) {
    val app = reactApplicationContext.applicationContext as Application
    promise.resolve(NavigationApi.areTermsAccepted(app))
  }

  override fun resetTermsAccepted() {
    val app = reactApplicationContext.applicationContext as Application
    NavigationApi.resetTermsAccepted(app)
  }

  override fun isGuidanceRunning(promise: Promise) {
    promise.resolve(false)
  }

  override fun getSDKVersion(promise: Promise) {
    try {
      promise.resolve(NavigationApi.getNavSDKVersion())
    } catch (_: Exception) {
      promise.resolve("unknown")
    }
  }

  // ─── Background Location ─────────────────────────────────────────────────────

  override fun addListener(eventName: String) {
    // Required by NativeEventEmitter — no-op on Android (events go via DeviceEventManagerModule)
  }

  override fun removeListeners(count: Double) {
    // Required by NativeEventEmitter — no-op on Android
  }

  override fun startBackgroundLocationUpdates(
    intervalMs: Double,
    notificationTitle: String,
    notificationText: String,
    promise: Promise
  ) {
    LocationForegroundService.onLocation = { lat, lng, bearing, speed, accuracy, timestamp ->
      val params = WritableNativeMap().apply {
        putDouble("latitude", lat)
        putDouble("longitude", lng)
        putDouble("bearing", bearing)
        putDouble("speed", speed)
        putDouble("accuracy", accuracy)
        putDouble("timestamp", timestamp.toDouble())
      }
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onBackgroundLocationUpdate", params)
    }

    val intent = Intent(reactApplicationContext, LocationForegroundService::class.java).apply {
      putExtra(LocationForegroundService.EXTRA_INTERVAL_MS, intervalMs.toLong())
      putExtra(LocationForegroundService.EXTRA_NOTIFICATION_TITLE, notificationTitle)
      putExtra(LocationForegroundService.EXTRA_NOTIFICATION_TEXT, notificationText)
    }
    reactApplicationContext.startForegroundService(intent)
    promise.resolve(true)
  }

  override fun stopBackgroundLocationUpdates(promise: Promise) {
    LocationForegroundService.onLocation = null
    val intent = Intent(reactApplicationContext, LocationForegroundService::class.java)
    reactApplicationContext.stopService(intent)
    promise.resolve(true)
  }

  companion object {
    const val NAME = "GoogleNavModule"
  }
}
