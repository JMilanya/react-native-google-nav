package com.googlenav

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class GoogleNavPackage : BaseReactPackage() {

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    listOf(GoogleNavViewManager())

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    when (name) {
      GoogleNavModule.NAME -> GoogleNavModule(reactContext)
      else -> null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        GoogleNavModule.NAME to ReactModuleInfo(
          GoogleNavModule.NAME,
          GoogleNavModule.NAME,
          false,  // canOverrideExistingModule
          false,  // needsEagerInit
          false,  // isCxxModule
          true    // isTurboModule
        )
      )
    }
}
