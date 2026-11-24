package expo.modules.wearscore

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.core.os.bundleOf
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.ArrayDeque

object WearScoreBridge {
  private val main = Handler(Looper.getMainLooper())
  private val pending = ArrayDeque<String>()
  var module: WearScoreModule? = null
  var lastPayload: String = ""

  fun onListening(next: WearScoreModule) {
    module = next
    val queued = mutableListOf<String>()
    synchronized(pending) {
      while (pending.isNotEmpty()) queued.add(pending.removeFirst())
    }
    queued.forEach { deliver(next, it) }
  }

  fun onSilent(next: WearScoreModule) {
    if (module === next) module = null
  }

  fun emit(action: String) {
    val current = module
    if (current == null) {
      synchronized(pending) { pending.addLast(action) }
      return
    }
    deliver(current, action)
  }

  fun publish(context: Context, payload: String) {
    lastPayload = payload
    send(context, "/padel/state", payload)
  }

  fun republish(context: Context) {
    if (lastPayload.isNotEmpty()) send(context, "/padel/state", lastPayload)
  }

  fun openPhone(context: Context) {
    try {
      val launch = Intent().apply {
        setClassName("com.contadorpadel.app", "com.contadorpadel.app.MainActivity")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(launch)
    } catch (_: Exception) {
    }
  }

  private fun deliver(target: WearScoreModule, action: String) {
    main.post {
      target.sendEvent("onCommand", bundleOf("action" to action))
    }
  }

  private fun send(context: Context, path: String, payload: String) {
    try {
      val bytes = payload.toByteArray(Charsets.UTF_8)
      val messages = Wearable.getMessageClient(context)
      Wearable.getNodeClient(context).connectedNodes.addOnSuccessListener { nodes ->
        nodes.forEach { node -> messages.sendMessage(node.id, path, bytes) }
      }
    } catch (_: Exception) {
    }
  }
}

class WearScoreModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WearScore")
    Events("onCommand")

    OnStartObserving("onCommand") {
      WearScoreBridge.onListening(this@WearScoreModule)
    }

    OnStopObserving("onCommand") {
      WearScoreBridge.onSilent(this@WearScoreModule)
    }

    Function("publish") { payload: String ->
      val context = appContext.reactContext ?: return@Function
      WearScoreBridge.publish(context, payload)
    }
  }
}

class WearScoreService : WearableListenerService() {
  override fun onMessageReceived(event: MessageEvent) {
    when (event.path) {
      "/padel/cmd" -> {
        val action = String(event.data, Charsets.UTF_8)
        if (WearScoreBridge.module == null) WearScoreBridge.openPhone(this)
        WearScoreBridge.emit(action)
      }
      "/padel/request" -> WearScoreBridge.republish(this)
    }
  }
}
