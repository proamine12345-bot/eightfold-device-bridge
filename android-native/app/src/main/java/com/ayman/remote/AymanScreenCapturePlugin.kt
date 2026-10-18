package com.ayman.remote

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Plugin Capacitor : capture d'écran via l'API officielle MediaProjection.
 * Android affiche lui-même la boîte de dialogue de consentement à chaque session.
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

        // Enregistrer le callback AVANT de démarrer le service évite une course où onCreate()
        // s'exécute avant l'affectation de onReady et la promesse JavaScript reste bloquée.
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
        service.setRemoteAnswer(call.getString("sdp") ?: "")
        call.resolve()
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
    fun stopCapture(call: PluginCall) {
        context.stopService(Intent(context, ScreenCaptureService::class.java))
        call.resolve()
    }
}
