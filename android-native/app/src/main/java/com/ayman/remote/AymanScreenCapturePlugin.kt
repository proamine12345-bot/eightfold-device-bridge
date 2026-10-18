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
        // Android 14+ : le service au premier plan doit démarrer AVANT getMediaProjection().
        val intent = Intent(context, ScreenCaptureService::class.java)
        context.startForegroundService(intent)

        ScreenCaptureService.onReady = { service ->
            service.startSession(
                resultCode = result.resultCode,
                data = result.data!!,
                iceServers = iceServers,
                onOffer = { sdp -> call.resolve(JSObject().put("type", "offer").put("sdp", sdp)) },
                onIce = { c, mid, idx ->
                    notifyListeners("iceCandidate", JSObject().put("candidate", c).put("sdpMid", mid).put("sdpMLineIndex", idx))
                },
                onStopped = { notifyListeners("captureStopped", JSObject()) },
                onError = { msg -> call.reject(msg) },
            )
        }
    }

    @PluginMethod
    fun setRemoteAnswer(call: PluginCall) {
        ScreenCaptureService.instance?.setRemoteAnswer(call.getString("sdp") ?: "")
        call.resolve()
    }

    @PluginMethod
    fun addIceCandidate(call: PluginCall) {
        ScreenCaptureService.instance?.addIce(
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
