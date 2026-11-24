package com.contadorpadel.wear

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

data class Score(
  val status: String = "idle",
  val left: String = "",
  val right: String = "",
  val leftPoints: String = "–",
  val rightPoints: String = "–",
  val games: String = "",
  val sets: String = "",
  val headline: String = "Buscando el teléfono…",
  val serving: Int = -1,
)

object LinkState {
  var connected = false
  var score = Score()
  var listener: (() -> Unit)? = null

  fun onNodes(ok: Boolean) {
    connected = ok
    listener?.invoke()
  }

  fun onScore(next: Score) {
    score = next
    connected = true
    listener?.invoke()
  }
}

object PhoneLink {
  private val main = Handler(Looper.getMainLooper())

  fun parse(json: String): Score {
    return try {
      val value = JSONObject(json)
      Score(
        status = value.optString("status", "idle"),
        left = value.optString("left"),
        right = value.optString("right"),
        leftPoints = value.optString("leftPoints", "–"),
        rightPoints = value.optString("rightPoints", "–"),
        games = value.optString("games"),
        sets = value.optString("sets"),
        headline = value.optString("headline", "Buscando el teléfono…"),
        serving = if (value.isNull("serving")) -1 else value.optInt("serving", -1),
      )
    } catch (_: Exception) {
      Score(headline = "No llega el marcador")
    }
  }

  fun request(context: Context) {
    send(context, "/padel/request", "1")
  }

  fun command(context: Context, body: String) {
    send(context, "/padel/cmd", body)
  }

  private fun send(context: Context, path: String, body: String) {
    try {
      val bytes = body.toByteArray(Charsets.UTF_8)
      val messages = Wearable.getMessageClient(context)
      Wearable.getNodeClient(context).connectedNodes
        .addOnSuccessListener { nodes ->
          main.post {
            if (nodes.isEmpty()) {
              LinkState.onNodes(false)
            } else {
              LinkState.onNodes(true)
              nodes.forEach { node -> messages.sendMessage(node.id, path, bytes) }
            }
          }
        }
        .addOnFailureListener { main.post { LinkState.onNodes(false) } }
    } catch (_: Exception) {
      main.post { LinkState.onNodes(false) }
    }
  }
}

class StateService : WearableListenerService() {
  override fun onMessageReceived(event: MessageEvent) {
    if (event.path != "/padel/state") return
    val score = PhoneLink.parse(String(event.data, Charsets.UTF_8))
    Handler(Looper.getMainLooper()).post { LinkState.onScore(score) }
  }
}
