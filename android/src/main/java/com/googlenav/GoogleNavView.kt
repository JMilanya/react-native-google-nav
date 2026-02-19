package com.googlenav

import android.app.Application
import android.graphics.Color
import android.location.Location
import android.os.Bundle
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.libraries.navigation.ArrivalEvent
import com.google.android.libraries.navigation.NavigationApi
import com.google.android.libraries.navigation.NavigationView
import com.google.android.libraries.navigation.Navigator
import com.google.android.libraries.navigation.RoadSnappedLocationProvider
import com.google.android.libraries.navigation.RouteSegment
import com.google.android.libraries.navigation.RoutingOptions
import com.google.android.libraries.navigation.SimulationOptions
import com.google.android.libraries.navigation.SpeedAlertOptions
import com.google.android.libraries.navigation.SpeedAlertSeverity
import com.google.android.libraries.navigation.SpeedingListener
import com.google.android.libraries.navigation.Waypoint
import org.json.JSONArray
import org.json.JSONObject

class GoogleNavView(private val themedContext: ThemedReactContext) :
  FrameLayout(themedContext),
  Navigator.ArrivalListener,
  Navigator.RouteChangedListener,
  Navigator.RemainingTimeOrDistanceChangedListener,
  Navigator.TrafficUpdatedListener,
  Navigator.ReroutingListener,
  SpeedingListener,
  RoadSnappedLocationProvider.LocationListener {

  private var navigationView: NavigationView? = null
  private var googleMap: GoogleMap? = null
  private var navigator: Navigator? = null
  private var locationProvider: RoadSnappedLocationProvider? = null

  // NavigationView lifecycle guards — SDK throws if onResume/onPause called twice in a row
  private var isViewResumed = false

  // Simulation state
  private var isSimulationActive = false
  private var lastArrivalLatLng: LatLng? = null
  private var needsRouteRebuild = false

  // Camera perspective prop
  private var propFollowingPerspective = 0

  // Foreground location throttle (30 seconds)
  private var lastLocationEmitTime = 0L

  // Camera follow re-assertion throttle (2 seconds)
  private var lastFollowReassertTime = 0L

  // Marker tracking for removeMarker by ID
  private val markerMap = HashMap<String, Marker>()


  // Multi-stop waypoint tracking
  private var storedWaypoints: MutableList<JSONObject> = mutableListOf()
  private var currentWaypointIndex = 0
  private var lastTravelMode = 0
  private var lastAvoidTolls = false
  private var lastAvoidHighways = false
  private var lastAvoidFerries = false

  init {
    val navView = NavigationView(themedContext).also { v ->
      v.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    }
    addView(navView)
    navView.onCreate(Bundle())
    navView.onStart()
    navView.onResume()
    isViewResumed = true
    navigationView = navView

    navView.getMapAsync { map ->
      googleMap = map
      // Apply bottom padding so the navigation arrow sits well above the
      // collapsed bottom pill.  Use displayMetrics as a reliable fallback
      // because the view's own height may still be 0 at this point.
      applyMapBottomPadding(map)
      // Reapply after layout pass in case the view wasn't measured yet.
      post { applyMapBottomPadding(map) }
      map.setOnMapClickListener { latLng ->
        emitEvent("onMapClick", Arguments.createMap().apply {
          putDouble("latitude", latLng.latitude)
          putDouble("longitude", latLng.longitude)
        })
      }
      emitEvent("onMapReady", Arguments.createMap())
    }

    // Navigator comes from NavigationApi, not NavigationView
    themedContext.currentActivity?.let { activity ->
    NavigationApi.getNavigator(activity, object : NavigationApi.NavigatorListener {
      override fun onNavigatorReady(nav: Navigator) {
        navigator = nav
        nav.addArrivalListener(this@GoogleNavView)
        nav.addRouteChangedListener(this@GoogleNavView)
        // min 5 seconds, min 50 meters between callbacks
        nav.addRemainingTimeOrDistanceChangedListener(5, 50, this@GoogleNavView)
        nav.addTrafficUpdatedListener(this@GoogleNavView)
        nav.addReroutingListener(this@GoogleNavView)

        // Speed alerts — configure thresholds and register listener
        val speedOpts = SpeedAlertOptions.Builder()
          .setSpeedAlertThresholdPercentage(SpeedAlertSeverity.MINOR, 5f)
          .setSpeedAlertThresholdPercentage(SpeedAlertSeverity.MAJOR, 10f)
          .setSeverityUpgradeDurationSeconds(5.0)
          .build()
        nav.setSpeedAlertOptions(speedOpts)
        nav.setSpeedingListener(this@GoogleNavView)


        // Location provider comes from NavigationApi
        val app = themedContext.applicationContext as Application
        locationProvider = NavigationApi.getRoadSnappedLocationProvider(app)?.also { lp ->
          lp.addLocationListener(this@GoogleNavView)
        }
        // Start in follow mode so the map is positioned correctly before guidance starts
        googleMap?.followMyLocation(getCameraPerspective())
        emitEvent("onNavigationReady", Arguments.createMap())
      }

      override fun onError(errorCode: Int) {
        emitEvent("onNavigationStateChanged", Arguments.createMap().apply {
          putString("state", "ERROR_INIT_$errorCode")
        })
      }
    })
    } // end currentActivity?.let

    // React Native lifecycle — guard against duplicate onResume/onPause calls
    themedContext.addLifecycleEventListener(object : com.facebook.react.bridge.LifecycleEventListener {
      override fun onHostResume() {
        if (!isViewResumed) {
          isViewResumed = true
          navigationView?.onResume()
        }
      }
      override fun onHostPause() {
        if (isViewResumed) {
          isViewResumed = false
          navigationView?.onPause()
        }
      }
      override fun onHostDestroy() { cleanup() }
    })
  }

  // ─── Event Emission ──────────────────────────────────────────────────────────

  private fun emitEvent(eventName: String, data: WritableMap) {
    val reactContext = context as? ReactContext ?: return
    val surfaceId = UIManagerHelper.getSurfaceId(this)
    UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
      ?.dispatchEvent(GoogleNavEvent(surfaceId, id, eventName, data))
  }

  // ─── Commands ────────────────────────────────────────────────────────────────

  fun setDestinations(
    waypointsJson: String,
    travelMode: Int,
    avoidTolls: Boolean,
    avoidHighways: Boolean,
    avoidFerries: Boolean
  ) {
    val array = JSONArray(waypointsJson)
    storedWaypoints = mutableListOf()
    for (i in 0 until array.length()) storedWaypoints.add(array.getJSONObject(i))
    currentWaypointIndex = 0
    lastTravelMode = travelMode
    lastAvoidTolls = avoidTolls
    lastAvoidHighways = avoidHighways
    lastAvoidFerries = avoidFerries

    emitEvent("onNavigationStateChanged", Arguments.createMap().apply { putString("state", "ROUTE_REQUESTED") })

    val navWaypoints = buildNavWaypoints(0)
    val options = buildRoutingOptions(travelMode, avoidTolls, avoidHighways, avoidFerries)

    navigator?.setDestinations(navWaypoints, options)?.setOnResultListener { routeStatus ->
      if (routeStatus == Navigator.RouteStatus.OK) {
        val td = navigator?.getCurrentTimeAndDistance()
        emitEvent("onRouteReady", Arguments.createMap().apply {
          putDouble("totalTimeSeconds", (td?.seconds ?: 0).toDouble())
          putDouble("totalDistanceMeters", (td?.meters ?: 0).toDouble())
        })
        emitEvent("onNavigationStateChanged", Arguments.createMap().apply { putString("state", "ROUTE_READY") })
      } else {
        emitEvent("onNavigationStateChanged", Arguments.createMap().apply { putString("state", "ERROR_$routeStatus") })
      }
    }
  }

  fun startGuidance() {
    navigator?.startGuidance()
    // Enable voice guidance using the proper SDK bitmask constants.
    // post() defers until after the current frame so the SDK can finish internal
    // audio setup before we set the guidance type. postDelayed provides a safety net.
    val voiceFlags = Navigator.AudioGuidance.VOICE_ALERTS_AND_GUIDANCE or Navigator.AudioGuidance.VIBRATION
    post { navigator?.setAudioGuidance(voiceFlags) }
    postDelayed({ navigator?.setAudioGuidance(voiceFlags) }, 500L)
    googleMap?.followMyLocation(getCameraPerspective())
    emitEvent("onNavigationStateChanged", Arguments.createMap().apply { putString("state", "NAVIGATING") })
  }

  fun stopGuidance() {
    navigator?.stopGuidance()
    // Disengage followMyLocation camera mode so arrow stops moving during OTP
    googleMap?.let { map ->
      map.moveCamera(CameraUpdateFactory.newCameraPosition(map.cameraPosition))
    }
    emitEvent("onNavigationStateChanged", Arguments.createMap().apply { putString("state", "IDLE") })
  }

  fun clearDestinations() {
    navigator?.clearDestinations()
    storedWaypoints.clear()
    currentWaypointIndex = 0
  }

  fun recenterCamera() {
    googleMap?.followMyLocation(getCameraPerspective())
  }

  fun showRouteOverview() {
    // NavigationView has a built-in showRouteOverview method
    navigationView?.showRouteOverview()
  }

  fun moveCamera(latitude: Double, longitude: Double, zoom: Float, bearing: Float, tilt: Float) {
    val cameraPos = com.google.android.gms.maps.model.CameraPosition.Builder()
      .target(LatLng(latitude, longitude))
      .zoom(zoom)
      .bearing(bearing)
      .tilt(tilt)
      .build()
    googleMap?.animateCamera(CameraUpdateFactory.newCameraPosition(cameraPos))
  }

  fun setAudioGuidance(audioGuidance: Int) {
    // Map JS enum (0-3) to the Android SDK bitmask constants.
    val flags = when (audioGuidance) {
      0 -> Navigator.AudioGuidance.SILENT
      1 -> Navigator.AudioGuidance.VOICE_ALERTS_ONLY or Navigator.AudioGuidance.VIBRATION
      2 -> Navigator.AudioGuidance.VOICE_ALERTS_AND_GUIDANCE or Navigator.AudioGuidance.VIBRATION
      3 -> Navigator.AudioGuidance.VIBRATION
      else -> Navigator.AudioGuidance.VOICE_ALERTS_AND_GUIDANCE or Navigator.AudioGuidance.VIBRATION
    }
    android.util.Log.d("GoogleNavView", "setAudioGuidance: input=$audioGuidance flags=$flags")
    navigator?.setAudioGuidance(flags)
  }

  fun setTrafficEnabled(enabled: Boolean) {
    googleMap?.isTrafficEnabled = enabled
  }

  fun startSimulation() {
    android.util.Log.d("GoogleNavView", "startSimulation: rebuild=$needsRouteRebuild wpIdx=$currentWaypointIndex total=${storedWaypoints.size} perspective=$propFollowingPerspective")
    isSimulationActive = true
    // Un-pause the simulator (onArrival pauses it)
    navigator?.simulator?.resume()
    navigator?.simulator?.unsetUserLocation()

    if (needsRouteRebuild && currentWaypointIndex < storedWaypoints.size) {
      // After OTP: rebuild route with ONLY remaining waypoints.
      // This clears stale polylines from completed legs and creates a fresh route.
      needsRouteRebuild = false
      navigator?.stopGuidance()
      navigator?.clearDestinations()
      val navWaypoints = buildNavWaypoints(currentWaypointIndex)
      val options = buildRoutingOptions(lastTravelMode, lastAvoidTolls, lastAvoidHighways, lastAvoidFerries)
      navigator?.setDestinations(navWaypoints, options)?.setOnResultListener { routeStatus ->
        if (routeStatus == Navigator.RouteStatus.OK) {
          android.util.Log.d("GoogleNavView", "startSimulation: route rebuilt OK, starting sim")
          navigator?.startGuidance()
          val flags = Navigator.AudioGuidance.VOICE_ALERTS_AND_GUIDANCE or Navigator.AudioGuidance.VIBRATION
          post { navigator?.setAudioGuidance(flags) }
          postDelayed({ navigator?.setAudioGuidance(flags) }, 500L)
          googleMap?.followMyLocation(getCameraPerspective())
          navigator?.simulator?.simulateLocationsAlongExistingRoute(
            SimulationOptions().speedMultiplier(getSimulationSpeed())
          )
        } else {
          android.util.Log.e("GoogleNavView", "startSimulation: route rebuild FAILED: $routeStatus")
          emitEvent("onNavigationStateChanged", Arguments.createMap().apply { putString("state", "ERROR_$routeStatus") })
        }
      }
    } else {
      // First start: route already computed by setDestinations, just start guidance + sim
      if (navigator?.isGuidanceRunning != true) {
        navigator?.startGuidance()
      }
      val simVoiceFlags = Navigator.AudioGuidance.VOICE_ALERTS_AND_GUIDANCE or Navigator.AudioGuidance.VIBRATION
      post { navigator?.setAudioGuidance(simVoiceFlags) }
      postDelayed({ navigator?.setAudioGuidance(simVoiceFlags) }, 500L)
      googleMap?.followMyLocation(getCameraPerspective())
      navigator?.simulator?.simulateLocationsAlongExistingRoute(
        SimulationOptions().speedMultiplier(getSimulationSpeed())
      )
    }
  }

  private fun getSimulationSpeed(): Float {
    return when (lastTravelMode) {
      2 -> 1.5f  // WALKING — slow to avoid erratic road-snapping
      1, 3 -> 3f // TWO_WHEELER / CYCLING
      else -> 5f // DRIVING
    }
  }

  fun stopSimulation() {
    android.util.Log.d("GoogleNavView", "stopSimulation: lastArrival=$lastArrivalLatLng guidanceRunning=${navigator?.isGuidanceRunning}")
    isSimulationActive = false
    // pause() is the ONLY way to actually stop the Android simulator.
    // setUserLocation() does NOT override simulateLocationsAlongExistingRoute().
    // Keep guidance active so the Navigator remembers visited waypoints.
    // Any brief “Searching for GPS” is not visible because the user is on the
    // OTP screen. When startSimulation() is called, resume()+simulate clears it.
    navigator?.simulator?.pause()
  }

  fun addMarker(markerId: String, latitude: Double, longitude: Double, title: String, snippet: String) {
    val marker = googleMap?.addMarker(
      MarkerOptions()
        .position(LatLng(latitude, longitude))
        .title(title)
        .snippet(snippet)
    )
    if (marker != null) markerMap[markerId] = marker
  }

  fun removeMarker(markerId: String) {
    markerMap.remove(markerId)?.remove()
  }

  fun clearMap() {
    markerMap.clear()
    googleMap?.clear()
  }

  fun addDestination(waypointJson: String, atIndex: Int) {
    val wp = JSONObject(waypointJson)
    val idx = if (atIndex < 0 || atIndex > storedWaypoints.size) storedWaypoints.size else atIndex
    storedWaypoints.add(idx, wp)
    if (idx <= currentWaypointIndex) currentWaypointIndex++
    rebuildRoute()
  }

  fun removeDestination(atIndex: Int) {
    if (atIndex < 0 || atIndex >= storedWaypoints.size) return
    storedWaypoints.removeAt(atIndex)
    when {
      atIndex < currentWaypointIndex -> currentWaypointIndex--
      atIndex == currentWaypointIndex && currentWaypointIndex >= storedWaypoints.size ->
        currentWaypointIndex = storedWaypoints.size - 1
    }
    if (storedWaypoints.isEmpty()) { navigator?.clearDestinations(); return }
    rebuildRoute()
  }

  fun updateDestination(atIndex: Int, waypointJson: String) {
    if (atIndex < 0 || atIndex >= storedWaypoints.size) return
    val newWp = JSONObject(waypointJson)
    val oldWp = storedWaypoints[atIndex]
    val positionChanged =
      Math.abs(newWp.optDouble("latitude", 0.0) - oldWp.optDouble("latitude", 0.0)) > 1e-7 ||
      Math.abs(newWp.optDouble("longitude", 0.0) - oldWp.optDouble("longitude", 0.0)) > 1e-7
    val merged = JSONObject(oldWp.toString())
    newWp.keys().forEach { key -> merged.put(key, newWp.get(key)) }
    storedWaypoints[atIndex] = merged
    if (positionChanged && atIndex >= currentWaypointIndex) rebuildRoute()
  }

  fun getCurrentRoute() {
    val segments: List<RouteSegment> = navigator?.getRouteSegments() ?: emptyList()
    if (segments.isEmpty()) {
      emitEvent("onRoutePolyline", Arguments.createMap().apply {
        putString("encodedPolyline", "")
        putString("coordinatesJson", "[]")
      })
      return
    }

    // Collect all LatLngs across all route segments
    val allPoints = mutableListOf<LatLng>()
    for (segment in segments) {
      allPoints.addAll(segment.latLngs)
    }

    if (allPoints.isEmpty()) {
      emitEvent("onRoutePolyline", Arguments.createMap().apply {
        putString("encodedPolyline", "")
        putString("coordinatesJson", "[]")
      })
      return
    }

    // Encode as polyline string (Google Encoded Polyline Algorithm)
    val encodedPolyline = encodePolyline(allPoints)

    // Serialize as JSON coordinate array
    val coordsArray = JSONArray()
    for (pt in allPoints) {
      coordsArray.put(JSONObject().apply {
        put("latitude", pt.latitude)
        put("longitude", pt.longitude)
      })
    }

    emitEvent("onRoutePolyline", Arguments.createMap().apply {
      putString("encodedPolyline", encodedPolyline)
      putString("coordinatesJson", coordsArray.toString())
    })
  }

  private fun encodePolyline(points: List<LatLng>): String {
    val result = StringBuilder()
    var prevLat = 0
    var prevLng = 0
    for (point in points) {
      val lat = Math.round(point.latitude * 1e5).toInt()
      val lng = Math.round(point.longitude * 1e5).toInt()
      encodePolylineValue(lat - prevLat, result)
      encodePolylineValue(lng - prevLng, result)
      prevLat = lat
      prevLng = lng
    }
    return result.toString()
  }

  private fun encodePolylineValue(value: Int, sb: StringBuilder) {
    var v = if (value < 0) (value shl 1).inv() else (value shl 1)
    while (v >= 0x20) {
      sb.append(((0x20 or (v and 0x1f)) + 63).toChar())
      v = v shr 5
    }
    sb.append((v + 63).toChar())
  }

  fun setFollowingPerspective(value: Int) {
    propFollowingPerspective = value
    googleMap?.followMyLocation(getCameraPerspective())
  }

  // ─── UI Props ──────────────────────────────────────────────────────────────

  fun applyMapType(value: Int) {
    googleMap?.mapType = when (value) {
      1 -> GoogleMap.MAP_TYPE_NORMAL
      2 -> GoogleMap.MAP_TYPE_SATELLITE
      3 -> GoogleMap.MAP_TYPE_TERRAIN
      4 -> GoogleMap.MAP_TYPE_HYBRID
      else -> GoogleMap.MAP_TYPE_NORMAL
    }
  }

  fun applyCompassEnabled(v: Boolean) { googleMap?.uiSettings?.isCompassEnabled = v }
  fun applyMyLocationButtonEnabled(v: Boolean) { googleMap?.uiSettings?.isMyLocationButtonEnabled = v }
  fun applyMyLocationEnabled(v: Boolean) { try { googleMap?.isMyLocationEnabled = v } catch (_: SecurityException) {} }
  fun applyRotateGesturesEnabled(v: Boolean) { googleMap?.uiSettings?.isRotateGesturesEnabled = v }
  fun applyScrollGesturesEnabled(v: Boolean) { googleMap?.uiSettings?.isScrollGesturesEnabled = v }
  fun applyTiltGesturesEnabled(v: Boolean) { googleMap?.uiSettings?.isTiltGesturesEnabled = v }
  fun applyZoomGesturesEnabled(v: Boolean) { googleMap?.uiSettings?.isZoomGesturesEnabled = v }
  fun applyBuildingsEnabled(v: Boolean) { googleMap?.isBuildingsEnabled = v }
  fun applyIndoorEnabled(v: Boolean) { googleMap?.isIndoorEnabled = v }

  fun applyNavigationUIEnabled(v: Boolean) { navigationView?.setNavigationUiEnabled(v) }
  fun applyHeaderEnabled(v: Boolean) { navigationView?.setHeaderEnabled(v) }
  fun applyFooterEnabled(v: Boolean) { /* NavigationView v7.1.0 has no setFooterEnabled */ }
  fun applyTripProgressBarEnabled(v: Boolean) { navigationView?.setTripProgressBarEnabled(v) }
  fun applySpeedometerEnabled(v: Boolean) { navigationView?.setSpeedometerEnabled(v) }
  fun applySpeedLimitIconEnabled(v: Boolean) { navigationView?.setSpeedLimitIconEnabled(v) }
  fun applyRecenterButtonEnabled(v: Boolean) { navigationView?.setRecenterButtonEnabled(v) }
  fun applyTrafficIncidentCardsEnabled(v: Boolean) { navigationView?.setTrafficIncidentCardsEnabled(v) }

  // ─── Theming ───────────────────────────────────────────────────────────────

  fun applyHeaderBackgroundColor(color: Int) {
    // NavigationView v7.1.0 does not expose header color theming.
    // Theming is applied through the Android theme/style system instead.
    android.util.Log.d("GoogleNavView", "applyHeaderBackgroundColor: not supported in SDK v7.1.0")
  }
  fun applyHeaderSecondaryBackgroundColor(color: Int) {
    android.util.Log.d("GoogleNavView", "applyHeaderSecondaryBackgroundColor: not supported in SDK v7.1.0")
  }

  // ─── Navigator Listeners ──────────────────────────────────────────────────

  override fun onArrival(arrivalEvent: ArrivalEvent) {
    val isFinal = arrivalEvent.isFinalDestination
    val wp = storedWaypoints.getOrNull(currentWaypointIndex)

    // Store arrival coordinates so simulation resumes from the correct position
    lastArrivalLatLng = arrivalEvent.waypoint?.position?.let { pos ->
      LatLng(pos.latitude, pos.longitude)
    } ?: wp?.let {
      LatLng(it.optDouble("latitude", 0.0), it.optDouble("longitude", 0.0))
    }

    val metadataJson = wp?.optJSONObject("metadata")?.toString() ?: "{}"

    emitEvent("onArrival", Arguments.createMap().apply {
      putInt("waypointIndex", currentWaypointIndex)
      putBoolean("isFinalDestination", isFinal)
      putDouble("waypointLatitude", wp?.optDouble("latitude", 0.0) ?: 0.0)
      putDouble("waypointLongitude", wp?.optDouble("longitude", 0.0) ?: 0.0)
      putString("waypointTitle", wp?.optString("title", "") ?: "")
      putString("waypointMetadata", metadataJson)
    })

    currentWaypointIndex++

    // Pause the simulator IMMEDIATELY for ALL stops (including final).
    // Do NOT emit ARRIVED state here — it races with handleArrival's setTimeout
    // to navigate to OTP, causing the OTP screen to be skipped on the final stop.
    // JS handles final-stop logic entirely through handleArrival + pendingFinalRef.
    android.util.Log.d("GoogleNavView", "onArrival: #${currentWaypointIndex - 1} final=$isFinal simActive=$isSimulationActive")
    if (isSimulationActive) {
      navigator?.simulator?.pause()
      isSimulationActive = false
    }
    if (!isFinal) {
      needsRouteRebuild = true
    }
  }

  override fun onRouteChanged() {
    emitEvent("onRouteChanged", Arguments.createMap())
  }

  override fun onRemainingTimeOrDistanceChanged() {
    val td = navigator?.getCurrentTimeAndDistance()
    emitEvent("onRemainingTimeOrDistanceChanged", Arguments.createMap().apply {
      putDouble("remainingTimeSeconds", (td?.seconds ?: 0).toDouble())
      putDouble("remainingDistanceMeters", (td?.meters ?: 0).toDouble())
    })
  }

  override fun onTrafficUpdated() {
    emitEvent("onTrafficUpdated", Arguments.createMap())
  }

  // ─── Rerouting Listener ────────────────────────────────────────────────

  override fun onReroutingRequestedByOffRoute() {
    emitEvent("onRerouting", Arguments.createMap())
  }

  // ─── Speeding Listener ─────────────────────────────────────────────────

  override fun onSpeedingUpdated(percentageAboveLimit: Float, severity: SpeedAlertSeverity) {
    // Negative values mean the vehicle is BELOW the speed limit — not actually speeding.
    // Only emit when genuinely exceeding the limit to avoid flooding JS with noise.
    if (percentageAboveLimit <= 0f) return
    emitEvent("onSpeeding", Arguments.createMap().apply {
      putDouble("percentageAboveLimit", percentageAboveLimit.toDouble())
      putString("severity", severity.name)
    })
  }


  // ─── Location Listener ───────────────────────────────────────────────────

  override fun onLocationChanged(location: Location) {
    val now = System.currentTimeMillis()

    // Re-assert camera follow mode every 5 seconds while guidance/simulation is
    // active.  Many actions silently disengage followMyLocation (user touch,
    // moveCamera calls, continueToNextDestination, route changes).  This keeps
    // the navigation arrow in view without the user having to tap Recenter.
    if ((navigator?.isGuidanceRunning == true || isSimulationActive) &&
        now - lastFollowReassertTime >= 2_000L) {
      lastFollowReassertTime = now
      googleMap?.followMyLocation(getCameraPerspective())
    }

    // Throttle foreground location events to once every 30 seconds
    if (now - lastLocationEmitTime < 30_000L) return
    lastLocationEmitTime = now

    emitEvent("onLocationChanged", Arguments.createMap().apply {
      putDouble("latitude", location.latitude)
      putDouble("longitude", location.longitude)
      putDouble("bearing", location.bearing.toDouble())
      putDouble("speed", location.speed.toDouble())
      putDouble("accuracy", location.accuracy.toDouble())
    })
  }

  override fun onRawLocationUpdate(location: Location) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private fun applyMapBottomPadding(map: GoogleMap) {
    // Prefer the view's actual height; fall back to screen height when the
    // view hasn't been laid out yet (height == 0).
    val h = if (height > 0) height else resources.displayMetrics.heightPixels
    val bottomPad = (h * 0.30f).toInt()
    android.util.Log.d("GoogleNavView", "applyMapBottomPadding: viewH=$height screenH=${resources.displayMetrics.heightPixels} pad=$bottomPad")
    map.setPadding(0, 0, 0, bottomPad)
  }

  private fun getCameraPerspective(): Int {
    return when (propFollowingPerspective) {
      0 -> GoogleMap.CameraPerspective.TILTED
      1 -> GoogleMap.CameraPerspective.TOP_DOWN_NORTH_UP
      2 -> GoogleMap.CameraPerspective.TOP_DOWN_HEADING_UP
      else -> GoogleMap.CameraPerspective.TOP_DOWN_HEADING_UP
    }
  }

  private fun buildNavWaypoints(startIdx: Int): List<Waypoint> {
    return storedWaypoints.drop(startIdx).mapNotNull { wp ->
      val placeId = wp.optString("placeId", "")
      try {
        if (placeId.isNotEmpty()) {
          Waypoint.builder().setPlaceIdString(placeId).setTitle(wp.optString("title", "")).build()
        } else {
          Waypoint.builder()
            .setLatLng(wp.getDouble("latitude"), wp.getDouble("longitude"))
            .setTitle(wp.optString("title", ""))
            .build()
        }
      } catch (_: Exception) { null }
    }
  }

  private fun buildRoutingOptions(
    travelMode: Int,
    avoidTolls: Boolean,
    avoidHighways: Boolean,
    avoidFerries: Boolean
  ): RoutingOptions {
    return RoutingOptions()
      .avoidTolls(avoidTolls)
      .avoidHighways(avoidHighways)
      .avoidFerries(avoidFerries)
      // Use DRIVING routing for ALL modes on Android.
      // TWO_WHEELER shows traffic overlays on unrelated roads and has rendering quirks.
      // WALKING doesn't animate the navigation arrow (only audio plays).
      // DRIVING gives consistent behavior: visible arrow, camera tracking, clean polylines.
      // Simulation speed still varies per mode (see getSimulationSpeed).
      .travelMode(RoutingOptions.TravelMode.DRIVING)
  }

  private fun rebuildRoute() {
    if (currentWaypointIndex >= storedWaypoints.size) { navigator?.clearDestinations(); return }
    emitEvent("onNavigationStateChanged", Arguments.createMap().apply { putString("state", "ROUTE_REQUESTED") })

    val wasGuidanceRunning = navigator?.isGuidanceRunning ?: false
    val wasSimulating = isSimulationActive

    navigator?.stopGuidance()

    val navWaypoints = buildNavWaypoints(currentWaypointIndex)
    val options = buildRoutingOptions(lastTravelMode, lastAvoidTolls, lastAvoidHighways, lastAvoidFerries)

    navigator?.setDestinations(navWaypoints, options)?.setOnResultListener { routeStatus ->
      if (routeStatus == Navigator.RouteStatus.OK) {
        val td = navigator?.getCurrentTimeAndDistance()
        emitEvent("onRouteReady", Arguments.createMap().apply {
          putDouble("totalTimeSeconds", (td?.seconds ?: 0).toDouble())
          putDouble("totalDistanceMeters", (td?.meters ?: 0).toDouble())
        })
        emitEvent("onNavigationStateChanged", Arguments.createMap().apply { putString("state", "ROUTE_READY") })
        if (wasGuidanceRunning || wasSimulating) {
          navigator?.startGuidance()
          val rebuildVoiceFlags = Navigator.AudioGuidance.VOICE_ALERTS_AND_GUIDANCE or Navigator.AudioGuidance.VIBRATION
          post { navigator?.setAudioGuidance(rebuildVoiceFlags) }
          postDelayed({ navigator?.setAudioGuidance(rebuildVoiceFlags) }, 500L)
        }
        if (wasSimulating) {
          navigator?.simulator?.simulateLocationsAlongExistingRoute(SimulationOptions().speedMultiplier(getSimulationSpeed()))
        }
      } else {
        emitEvent("onNavigationStateChanged", Arguments.createMap().apply { putString("state", "ERROR_$routeStatus") })
      }
    }
  }

  private fun cleanup() {
    navigator?.removeArrivalListener(this)
    navigator?.removeRouteChangedListener(this)
    navigator?.removeRemainingTimeOrDistanceChangedListener(this)
    navigator?.removeTrafficUpdatedListener(this)
    navigator?.removeReroutingListener(this)
    locationProvider?.removeLocationListener(this)
    navigator?.clearDestinations()
    navigator?.cleanup()
    markerMap.clear()
    lastArrivalLatLng = null
    if (isViewResumed) {
      isViewResumed = false
      navigationView?.onPause()
    }
    navigationView?.onStop()
    navigationView?.onDestroy()
  }
}
