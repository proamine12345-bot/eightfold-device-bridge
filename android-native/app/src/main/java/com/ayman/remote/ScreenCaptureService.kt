package com.ayman.remote

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import org.webrtc.*

/**
 * Service au premier plan requis par Android (type mediaProjection) qui détient
 * la MediaProjection autorisée et envoie l'écran via une PeerConnection WebRTC.
 */
class ScreenCaptureService : Service() {

    companion object {
        @Volatile var instance: ScreenCaptureService? = null
        @Volatile var onReady: ((ScreenCaptureService) -> Unit)? = null
        private const val CHANNEL_ID = "ayman_remote_capture"
    }

    private lateinit var eglBase: EglBase
    private var factory: PeerConnectionFactory? = null
    private var peer: PeerConnection? = null
    private var capturer: VideoCapturer? = null
    private var onStoppedCallback: (() -> Unit)? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        createChannel()
        val notification: Notification = Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Ayman Remote")
            .setContentText("Partage d'écran en cours")
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
        } else {
            startForeground(1, notification)
        }
        val ready = onReady
        onReady = null
        ready?.invoke(this)
    }

    fun startSession(
        resultCode: Int,
        data: Intent,
        iceServers: List<String>,
        onOffer: (String) -> Unit,
        onIce: (String, String, Int) -> Unit,
        onStopped: () -> Unit,
        onError: (String) -> Unit,
    ) {
        try {
            onStoppedCallback = onStopped
            eglBase = EglBase.create()
            PeerConnectionFactory.initialize(
                PeerConnectionFactory.InitializationOptions.builder(applicationContext).createInitializationOptions()
            )
            factory = PeerConnectionFactory.builder()
                .setVideoEncoderFactory(DefaultVideoEncoderFactory(eglBase.eglBaseContext, true, true))
                .setVideoDecoderFactory(DefaultVideoDecoderFactory(eglBase.eglBaseContext))
                .createPeerConnectionFactory()

            val config = PeerConnection.RTCConfiguration(
                iceServers.map { PeerConnection.IceServer.builder(it).createIceServer() }
            ).apply { sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN }

            peer = factory!!.createPeerConnection(config, object : PeerConnection.Observer {
                override fun onIceCandidate(c: IceCandidate) = onIce(c.sdp, c.sdpMid, c.sdpMLineIndex)
                override fun onConnectionChange(newState: PeerConnection.PeerConnectionState) {
                    if (newState == PeerConnection.PeerConnectionState.FAILED) onStopped()
                }
                override fun onSignalingChange(p0: PeerConnection.SignalingState?) {}
                override fun onIceConnectionChange(p0: PeerConnection.IceConnectionState?) {}
                override fun onIceConnectionReceivingChange(p0: Boolean) {}
                override fun onIceGatheringChange(p0: PeerConnection.IceGatheringState?) {}
                override fun onIceCandidatesRemoved(p0: Array<out IceCandidate>?) {}
                override fun onAddStream(p0: MediaStream?) {}
                override fun onRemoveStream(p0: MediaStream?) {}
                override fun onDataChannel(p0: DataChannel?) {}
                override fun onRenegotiationNeeded() {}
                override fun onTrack(transceiver: RtpTransceiver?) {}
            }) ?: throw IllegalStateException("Impossible de créer la connexion WebRTC")

            val screenCapturer = ScreenCapturerAndroid(data, object : android.media.projection.MediaProjection.Callback() {
                override fun onStop() {
                    onStopped()
                    stopSelf()
                }
            })
            capturer = screenCapturer
            val helper = SurfaceTextureHelper.create("CaptureThread", eglBase.eglBaseContext)
            val source = factory!!.createVideoSource(true)
            screenCapturer.initialize(helper, applicationContext, source.capturerObserver)
            val metrics = resources.displayMetrics
            screenCapturer.startCapture(metrics.widthPixels, metrics.heightPixels, 30)
            peer!!.addTrack(factory!!.createVideoTrack("screen", source), listOf("ayman"))

            peer!!.createOffer(object : SdpObserver {
                override fun onCreateSuccess(desc: SessionDescription) {
                    peer?.setLocalDescription(object : SdpObserver {
                        override fun onSetSuccess() {
                            onOffer(desc.description)
                        }
                        override fun onSetFailure(error: String?) = onError(error ?: "Impossible de préparer l'offre WebRTC")
                        override fun onCreateSuccess(p0: SessionDescription?) {}
                        override fun onCreateFailure(error: String?) = onError(error ?: "Échec WebRTC")
                    }, desc)
                }
                override fun onSetSuccess() {}
                override fun onCreateFailure(err: String?) = onError(err ?: "Échec de création de l'offre WebRTC")
                override fun onSetFailure(err: String?) = onError(err ?: "Échec de configuration WebRTC")
            }, MediaConstraints())
        } catch (e: Exception) {
            onError(e.message ?: "Échec du partage d'écran")
        }
    }

    fun setRemoteAnswer(sdp: String, onComplete: (String?) -> Unit) {
        val activePeer = peer
        if (activePeer == null) {
            onComplete("Aucune connexion WebRTC active")
            return
        }
        activePeer.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() = onComplete(null)
            override fun onSetFailure(error: String?) = onComplete(error ?: "Impossible d'appliquer la réponse WebRTC")
            override fun onCreateSuccess(p0: SessionDescription?) {}
            override fun onCreateFailure(error: String?) = onComplete(error ?: "Échec de la réponse WebRTC")
        }, SessionDescription(SessionDescription.Type.ANSWER, sdp))
    }

    fun addIce(candidate: String, sdpMid: String?, sdpMLineIndex: Int) {
        peer?.addIceCandidate(IceCandidate(sdpMid, sdpMLineIndex, candidate))
    }

    override fun onDestroy() {
        try { capturer?.stopCapture() } catch (_: Exception) {}
        capturer?.dispose()
        peer?.close()
        factory?.dispose()
        if (instance === this) instance = null
        onStoppedCallback?.invoke()
        onStoppedCallback = null
        super.onDestroy()
    }

    private fun createChannel() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Partage d'écran", NotificationManager.IMPORTANCE_LOW)
        )
    }

    private class EmptySdpObserver : SdpObserver {
        override fun onCreateSuccess(p0: SessionDescription?) {}
        override fun onSetSuccess() {}
        override fun onCreateFailure(p0: String?) {}
        override fun onSetFailure(p0: String?) {}
    }
}
