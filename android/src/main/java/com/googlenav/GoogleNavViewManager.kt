package com.googlenav

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.GoogleNavViewManagerDelegate
import com.facebook.react.viewmanagers.GoogleNavViewManagerInterface

@ReactModule(name = GoogleNavViewManager.NAME)
class GoogleNavViewManager : SimpleViewManager<GoogleNavView>(),
  GoogleNavViewManagerInterface<GoogleNavView> {

  private val mDelegate = GoogleNavViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<GoogleNavView> = mDelegate

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): GoogleNavView =
    GoogleNavView(context)

  // ─── Props ──────────────────────────────────────────────────────────────────
  // Boolean props: codegen generates Java primitive boolean → non-nullable in Kotlin
  // Int/Color props: codegen generates Integer → nullable Int? in Kotlin

  override fun setFollowingPerspective(view: GoogleNavView, value: Int) {
    view.setFollowingPerspective(value)
  }

  override fun setMapType(view: GoogleNavView, value: Int) { view.applyMapType(value) }
  override fun setMapColorScheme(view: GoogleNavView, value: Int) {}
  override fun setHeaderBackgroundColor(view: GoogleNavView?, value: Int?) {
    if (view != null && value != null) view.applyHeaderBackgroundColor(value)
  }
  override fun setHeaderSecondaryBackgroundColor(view: GoogleNavView?, value: Int?) {
    if (view != null && value != null) view.applyHeaderSecondaryBackgroundColor(value)
  }
  override fun setHeaderTextColor(view: GoogleNavView?, value: Int?) {}
  override fun setHeaderManeuverIconColor(view: GoogleNavView?, value: Int?) {}

  override fun setCompassEnabled(view: GoogleNavView, value: Boolean) { view.applyCompassEnabled(value) }
  override fun setMyLocationButtonEnabled(view: GoogleNavView, value: Boolean) { view.applyMyLocationButtonEnabled(value) }
  override fun setMyLocationEnabled(view: GoogleNavView, value: Boolean) { view.applyMyLocationEnabled(value) }
  override fun setRotateGesturesEnabled(view: GoogleNavView, value: Boolean) { view.applyRotateGesturesEnabled(value) }
  override fun setScrollGesturesEnabled(view: GoogleNavView, value: Boolean) { view.applyScrollGesturesEnabled(value) }
  override fun setTiltGesturesEnabled(view: GoogleNavView, value: Boolean) { view.applyTiltGesturesEnabled(value) }
  override fun setZoomGesturesEnabled(view: GoogleNavView, value: Boolean) { view.applyZoomGesturesEnabled(value) }
  override fun setTrafficEnabled(view: GoogleNavView, value: Boolean) { view.setTrafficEnabled(value) }
  override fun setBuildingsEnabled(view: GoogleNavView, value: Boolean) { view.applyBuildingsEnabled(value) }
  override fun setIndoorEnabled(view: GoogleNavView, value: Boolean) { view.applyIndoorEnabled(value) }
  override fun setNavigationUIEnabled(view: GoogleNavView, value: Boolean) { view.applyNavigationUIEnabled(value) }
  override fun setHeaderEnabled(view: GoogleNavView, value: Boolean) { view.applyHeaderEnabled(value) }
  override fun setFooterEnabled(view: GoogleNavView, value: Boolean) { view.applyFooterEnabled(value) }
  override fun setTripProgressBarEnabled(view: GoogleNavView, value: Boolean) { view.applyTripProgressBarEnabled(value) }
  override fun setSpeedometerEnabled(view: GoogleNavView, value: Boolean) { view.applySpeedometerEnabled(value) }
  override fun setSpeedLimitIconEnabled(view: GoogleNavView, value: Boolean) { view.applySpeedLimitIconEnabled(value) }
  override fun setRecenterButtonEnabled(view: GoogleNavView, value: Boolean) { view.applyRecenterButtonEnabled(value) }
  override fun setTrafficIncidentCardsEnabled(view: GoogleNavView, value: Boolean) { view.applyTrafficIncidentCardsEnabled(value) }

  // ─── Commands ────────────────────────────────────────────────────────────────

  override fun setDestinations(
    view: GoogleNavView,
    waypointsJson: String,
    travelMode: Int,
    avoidTolls: Boolean,
    avoidHighways: Boolean,
    avoidFerries: Boolean
  ) {
    view.setDestinations(waypointsJson, travelMode, avoidTolls, avoidHighways, avoidFerries)
  }

  override fun startGuidance(view: GoogleNavView) { view.startGuidance() }
  override fun stopGuidance(view: GoogleNavView) { view.stopGuidance() }
  override fun clearDestinations(view: GoogleNavView) { view.clearDestinations() }
  override fun recenterCamera(view: GoogleNavView) { view.recenterCamera() }
  override fun showRouteOverview(view: GoogleNavView) { view.showRouteOverview() }

  override fun moveCamera(
    view: GoogleNavView,
    latitude: Double,
    longitude: Double,
    zoom: Float,
    bearing: Float,
    tilt: Float
  ) {
    view.moveCamera(latitude, longitude, zoom, bearing, tilt)
  }

  override fun setAudioGuidance(view: GoogleNavView, audioGuidance: Int) {
    view.setAudioGuidance(audioGuidance)
  }

  override fun startSimulation(view: GoogleNavView) { view.startSimulation() }
  override fun stopSimulation(view: GoogleNavView) { view.stopSimulation() }

  override fun addMarker(
    view: GoogleNavView,
    markerId: String,
    latitude: Double,
    longitude: Double,
    title: String,
    snippet: String
  ) {
    view.addMarker(markerId, latitude, longitude, title, snippet)
  }

  override fun removeMarker(view: GoogleNavView, markerId: String) { view.removeMarker(markerId) }
  override fun clearMap(view: GoogleNavView) { view.clearMap() }

  override fun addDestination(view: GoogleNavView, waypointJson: String, atIndex: Int) {
    view.addDestination(waypointJson, atIndex)
  }

  override fun removeDestination(view: GoogleNavView, atIndex: Int) {
    view.removeDestination(atIndex)
  }

  override fun updateDestination(view: GoogleNavView, atIndex: Int, waypointJson: String) {
    view.updateDestination(atIndex, waypointJson)
  }

  override fun getCurrentRoute(view: GoogleNavView) { view.getCurrentRoute() }

  companion object {
    const val NAME = "GoogleNavView"
  }
}
