package com.ayman.remote

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Bundle
import android.util.DisplayMetrics
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Explicitly enabled by the device owner in Android Accessibility settings.
 * Receives only actions forwarded during an accepted Ayman Remote session.
 */
class RemoteControlAccessibilityService : AccessibilityService() {
    companion object {
        @Volatile var instance: RemoteControlAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

    override fun onInterrupt() = Unit

    fun performRemoteAction(
        action: String,
        x: Float = 0f,
        y: Float = 0f,
        x2: Float = 0f,
        y2: Float = 0f,
        durationMs: Long = 350L,
        text: String? = null,
    ): Boolean {
        when (action) {
            "back" -> return performGlobalAction(GLOBAL_ACTION_BACK)
            "home" -> return performGlobalAction(GLOBAL_ACTION_HOME)
            "recents" -> return performGlobalAction(GLOBAL_ACTION_RECENTS)
            "text" -> {
                val root = rootInActiveWindow ?: return false
                val field = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return false
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text.orEmpty())
                }
                return field.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            }
            "tap", "swipe" -> {
                val metrics = DisplayMetrics()
                @Suppress("DEPRECATION")
                (getSystemService(WINDOW_SERVICE) as WindowManager).defaultDisplay.getRealMetrics(metrics)
                val startX = (x.coerceIn(0f, 1f) * metrics.widthPixels)
                val startY = (y.coerceIn(0f, 1f) * metrics.heightPixels)
                val endX = if (action == "tap") startX else x2.coerceIn(0f, 1f) * metrics.widthPixels
                val endY = if (action == "tap") startY else y2.coerceIn(0f, 1f) * metrics.heightPixels
                val path = Path().apply {
                    moveTo(startX, startY)
                    lineTo(endX, endY)
                }
                val duration = if (action == "tap") 80L else durationMs.coerceIn(100L, 1500L)
                val gesture = GestureDescription.Builder()
                    .addStroke(GestureDescription.StrokeDescription(path, 0L, duration))
                    .build()
                return dispatchGesture(gesture, null, null)
            }
            else -> return false
        }
    }

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }
}
