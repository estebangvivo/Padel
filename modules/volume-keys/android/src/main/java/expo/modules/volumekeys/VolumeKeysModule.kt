package expo.modules.volumekeys

import android.view.KeyEvent
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

object VolumeKeysBridge {
  var module: VolumeKeysModule? = null
  var listening: Boolean = false

  fun emit(action: String) {
    module?.send(action)
  }
}

class VolumeKeysModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VolumeKeys")

    Events("onVolumeKey")

    OnStartObserving("onVolumeKey") {
      VolumeKeysBridge.module = this@VolumeKeysModule
      VolumeKeysBridge.listening = true
    }

    OnStopObserving("onVolumeKey") {
      if (VolumeKeysBridge.module === this@VolumeKeysModule) {
        VolumeKeysBridge.module = null
        VolumeKeysBridge.listening = false
      }
    }
  }

  fun send(action: String) {
    sendEvent("onVolumeKey", bundleOf("action" to action))
  }
}

internal fun volumeAction(keyCode: Int): String? {
  return when (keyCode) {
    KeyEvent.KEYCODE_VOLUME_UP -> "up"
    KeyEvent.KEYCODE_VOLUME_DOWN -> "down"
    else -> null
  }
}
