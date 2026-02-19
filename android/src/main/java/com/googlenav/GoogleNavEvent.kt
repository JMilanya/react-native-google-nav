package com.googlenav

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class GoogleNavEvent(
  surfaceId: Int,
  viewTag: Int,
  private val name: String,
  private val data: WritableMap
) : Event<GoogleNavEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = name
  override fun getEventData(): WritableMap = data
}
