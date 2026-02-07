package com.googlenav

import android.graphics.Color
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.GoogleNavViewManagerInterface
import com.facebook.react.viewmanagers.GoogleNavViewManagerDelegate

@ReactModule(name = GoogleNavViewManager.NAME)
class GoogleNavViewManager : SimpleViewManager<GoogleNavView>(),
  GoogleNavViewManagerInterface<GoogleNavView> {
  private val mDelegate: ViewManagerDelegate<GoogleNavView>

  init {
    mDelegate = GoogleNavViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<GoogleNavView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): GoogleNavView {
    return GoogleNavView(context)
  }

  @ReactProp(name = "color")
  override fun setColor(view: GoogleNavView?, color: Int?) {
    view?.setBackgroundColor(color ?: Color.TRANSPARENT)
  }

  companion object {
    const val NAME = "GoogleNavView"
  }
}
