package expo.modules.volumekeys

import android.content.Context
import android.view.KeyEvent
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityHandler

class VolumeKeysPackage : Package {
  override fun createReactActivityHandlers(activityContext: Context): List<ReactActivityHandler> {
    return listOf(VolumeKeysActivityHandler())
  }
}

/**
 * While the match screen is listening, the volume keys score points instead of
 * changing the ringer. A short press reports up or down. A hold reports undo,
 * and the following key-up is ignored.
 */
class VolumeKeysActivityHandler : ReactActivityHandler {
  private var heldUndo = false

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (!VolumeKeysBridge.listening || volumeAction(keyCode) == null) return false
    if (event != null && event.repeatCount == 0) {
      heldUndo = false
      event.startTracking()
    }
    return true
  }

  override fun onKeyLongPress(keyCode: Int, event: KeyEvent?): Boolean {
    if (!VolumeKeysBridge.listening || volumeAction(keyCode) == null) return false
    if (!heldUndo) {
      heldUndo = true
      VolumeKeysBridge.emit("undo")
    }
    return true
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
    val action = volumeAction(keyCode) ?: return false
    if (!VolumeKeysBridge.listening) return false
    if (heldUndo || event == null || event.isCanceled) {
      heldUndo = false
      return true
    }
    VolumeKeysBridge.emit(action)
    return true
  }
}
