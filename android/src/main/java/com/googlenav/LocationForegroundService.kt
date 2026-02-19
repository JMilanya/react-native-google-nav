package com.googlenav

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

class LocationForegroundService : Service() {

  private lateinit var fusedClient: FusedLocationProviderClient
  private lateinit var locationCallback: LocationCallback

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    fusedClient = LocationServices.getFusedLocationProviderClient(this)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val intervalMs = intent?.getLongExtra(EXTRA_INTERVAL_MS, 30000L) ?: 30000L
    val title = intent?.getStringExtra(EXTRA_NOTIFICATION_TITLE) ?: "Location Active"
    val text = intent?.getStringExtra(EXTRA_NOTIFICATION_TEXT) ?: "Tracking delivery location"

    startForeground(NOTIFICATION_ID, buildNotification(title, text))
    startLocationUpdates(intervalMs)

    return START_STICKY
  }

  override fun onDestroy() {
    fusedClient.removeLocationUpdates(locationCallback)
    super.onDestroy()
  }

  private fun startLocationUpdates(intervalMs: Long) {
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
      .setMinUpdateIntervalMillis(intervalMs / 2)
      .build()

    locationCallback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        val location = result.lastLocation ?: return
        onLocation?.invoke(
          location.latitude,
          location.longitude,
          if (location.hasBearing()) location.bearing.toDouble() else 0.0,
          if (location.hasSpeed()) location.speed.toDouble() else 0.0,
          location.accuracy.toDouble(),
          location.time
        )
      }
    }

    try {
      fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
    } catch (_: SecurityException) {
      stopSelf()
    }
  }

  private fun buildNotification(title: String, text: String): Notification {
    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Location Tracking",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        setShowBadge(false)
      }
      manager.createNotificationChannel(channel)
    }

    return Notification.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setOngoing(true)
      .build()
  }

  companion object {
    const val EXTRA_INTERVAL_MS = "intervalMs"
    const val EXTRA_NOTIFICATION_TITLE = "notificationTitle"
    const val EXTRA_NOTIFICATION_TEXT = "notificationText"
    private const val NOTIFICATION_ID = 9871
    private const val CHANNEL_ID = "googlenav_location"

    /** Set by GoogleNavModule before starting the service. */
    var onLocation: ((lat: Double, lng: Double, bearing: Double, speed: Double, accuracy: Double, timestamp: Long) -> Unit)? = null
  }
}
