package com.ayman.remote

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.provider.Settings
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor bridge for screen sharing and owner-authorized remote touch actions.
 * Android itself asks for screen-capture consent; Accessibility must be enabled by
 * the device owner from system settings before remote gestures can be executed.
 */
@CapacitorPlugin(name = "AymanScreenCapture")
class AymanScreenCapturePlugin : Plugin() {

    private var iceServers: List<String> = emptyList()

    @PluginMethod
    fun startCapture(call: PluginCall) {
        val servers = call.getArray("iceServers")
        iceServers = (0 until (servers?.length() ?: 0)).map { servers!!.getString(it) }
        val mpm = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        startActivityForResult(call, mpm.createScreenCaptureIntent(), "onProjectionResult")
    }

    @ActivityCallback
    private fun onProjectionResult(call: PluginCall, result: ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK || result.data == null) {
            call.reject("Partage refusé par l'utilisateur")
            return
        }

        val startSession: (ScreenCaptureService) -> Unit = { service ->
            service.startSession(
                resultCode = result.resultCode,
                data = result.data!!,
                iceServers = iceServers,
                onOffer = { sdp -> call.resolve(JSObject().put("type", "offer").put("sdp", sdp)) },
                onIce = { candidate, mid, index ->
                    notifyListeners(
                        "iceCandidate",
                        JSObject().put("candidate", candidate).put("sdpMid", mid).put("sdpMLineIndex", index),
                    )
                },
                onStopped = { notifyListeners("captureStopped", JSObject()) },
                onError = { message -> call.reject(message) },
            )
        }

        // Set the callback before starting the service to avoid a race with onCreate().
        val existing = ScreenCaptureService.instance
        if (existing != null) {
            startSession(existing)
        } else {
            ScreenCaptureService.onReady = startSession
            try {
                context.startForegroundService(Intent(context, ScreenCaptureService::class.java))
            } catch (error: Exception) {
                ScreenCaptureService.onReady = null
                call.reject(error.message ?: "Impossible de démarrer le service de partage")
            }
        }
    }

    @PluginMethod
    fun setRemoteAnswer(call: PluginCall) {
        val service = ScreenCaptureService.instance
        if (service == null) {
            call.reject("Aucune session de partage active")
            return
        }
        service.setRemoteAnswer(call.getString("sdp") ?: "") { error ->
            if (error != null) call.reject(error) else call.resolve()
        }
    }

    @PluginMethod
    fun addIceCandidate(call: PluginCall) {
        val service = ScreenCaptureService.instance
        if (service == null) {
            call.reject("Aucune session WebRTC active")
            return
        }
        service.addIce(
            call.getString("candidate") ?: "",
            call.getString("sdpMid"),
            call.getInt("sdpMLineIndex") ?: 0,
        )
        call.resolve()
    }

    @PluginMethod
    fun openAccessibilitySettings(call: PluginCall) {
        try {
            context.startActivity(
                Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
            call.resolve()
        } catch (error: Exception) {
            call.reject(error.message ?: "Impossible d'ouvrir les paramètres d'accessibilité")
        }
    }

    @PluginMethod
    fun performRemoteAction(call: PluginCall) {
        val service = RemoteControlAccessibilityService.instance
        if (service == null) {
            call.reject("Activez le service de contrôle Ayman Remote dans les paramètres d'accessibilité Android.")
            return
        }
        val success = service.performRemoteAction(
            action = call.getString("action") ?: "",
            x = (call.getDouble("x") ?: 0.0).toFloat(),
            y = (call.getDouble("y") ?: 0.0).toFloat(),
            x2 = (call.getDouble("x2") ?: 0.0).toFloat(),
            y2 = (call.getDouble("y2") ?: 0.0).toFloat(),
            durationMs = (call.getDouble("durationMs") ?: 350.0).toLong(),
            text = call.getString("text"),
        )
        if (success) call.resolve() else call.reject("تعذر تنفيذ الإجراء. تأكد من تفعيل خدمة التحكم وأن الشاشة تسمح بهذا الإجراء.")
    }

    @PluginMethod
    fun isRemoteControlEnabled(call: PluginCall) {
        call.resolve(JSObject().put("enabled", RemoteControlAccessibilityService.instance != null))
    }

    @PluginMethod
    fun stopCapture(call: PluginCall) {
        context.stopService(Intent(context, ScreenCaptureService::class.java))
        call.resolve()
    }
}
