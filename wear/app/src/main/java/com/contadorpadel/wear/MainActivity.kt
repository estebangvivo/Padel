package com.contadorpadel.wear

import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text

private val Ink = Color(0xFF10140C)
private val Accent = Color(0xFFD2F34A)
private val Muted = Color(0xFF8B9BB0)
private val Line = Color(0xFF314056)

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    setContent {
      var score by remember { mutableStateOf(LinkState.score) }
      var connected by remember { mutableStateOf(LinkState.connected) }
      DisposableEffect(Unit) {
        LinkState.listener = {
          score = LinkState.score
          connected = LinkState.connected
        }
        PhoneLink.request(this@MainActivity)
        onDispose { LinkState.listener = null }
      }
      MaterialTheme {
        ScoreScreen(
          score = score,
          connected = connected,
          onLeft = { tap("0") },
          onRight = { tap("1") },
          onUndo = { tap("u") },
        )
      }
    }
  }

  private fun tap(body: String) {
    val vibrator = getSystemService(Vibrator::class.java)
    vibrator?.vibrate(VibrationEffect.createOneShot(if (body == "1") 40 else 20, VibrationEffect.DEFAULT_AMPLITUDE))
    PhoneLink.command(this, body)
  }
}

@Composable
private fun ScoreScreen(
  score: Score,
  connected: Boolean,
  onLeft: () -> Unit,
  onRight: () -> Unit,
  onUndo: () -> Unit,
) {
  Column(
    modifier = Modifier.fillMaxSize().background(Color(0xFF07090C)).padding(horizontal = 16.dp, vertical = 14.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.Center,
  ) {
    Text(
      text = if (connected) score.headline else "Sin teléfono",
      color = Accent,
      fontSize = 11.sp,
      fontWeight = FontWeight.Bold,
      maxLines = 2,
      textAlign = TextAlign.Center,
    )
    if (score.left.isNotEmpty() || score.right.isNotEmpty()) {
      Row(modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
        SideName(score.left, score.serving == 0, Modifier.weight(1f))
        SideName(score.right, score.serving == 1, Modifier.weight(1f))
      }
    }
    Row(
      modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.Center,
    ) {
      Text(score.leftPoints, color = if (score.serving == 0) Accent else Color.White, fontSize = 36.sp, fontWeight = FontWeight.Bold)
      Text("  ", fontSize = 20.sp)
      Text(score.rightPoints, color = if (score.serving == 1) Accent else Color.White, fontSize = 36.sp, fontWeight = FontWeight.Bold)
    }
    if (score.games.isNotEmpty()) {
      Text(
        text = if (score.sets.isNotEmpty()) "${score.games}    sets ${score.sets}" else score.games,
        color = Muted,
        fontSize = 12.sp,
      )
    }
    Row(
      modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
      horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
      PointButton("+", onLeft)
      PointButton("+", onRight)
    }
    Button(
      onClick = onUndo,
      modifier = Modifier.padding(top = 6.dp).fillMaxWidth(0.7f),
      colors = ButtonDefaults.buttonColors(backgroundColor = Line),
    ) {
      Text("Deshacer", color = Color.White, fontSize = 13.sp)
    }
  }
}

@Composable
private fun SideName(name: String, serving: Boolean, modifier: Modifier) {
  Text(
    text = name,
    modifier = modifier,
    color = if (serving) Accent else Muted,
    fontSize = 11.sp,
    fontWeight = FontWeight.Bold,
    maxLines = 2,
    overflow = TextOverflow.Ellipsis,
    textAlign = TextAlign.Center,
  )
}

@Composable
private fun PointButton(label: String, onClick: () -> Unit) {
  Button(
    onClick = onClick,
    modifier = Modifier.size(52.dp),
    colors = ButtonDefaults.buttonColors(backgroundColor = Accent),
  ) {
    Text(label, color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
  }
}
