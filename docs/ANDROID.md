# Ayman Remote — Passage à Android (Capacitor)

## Ce qui fonctionne déjà (version Web / PWA)

| Fonction | État |
|---|---|
| Code unique à 8 chiffres par appareil (unicité garantie en base) | ✅ |
| « Entrer un autre code » + recherche de l'appareil | ✅ |
| Demande de connexion + accord explicite du propriétaire | ✅ |
| Signalisation temps réel (Lovable Cloud Realtime) | ✅ |
| Flux vidéo WebRTC chiffré (DTLS-SRTP, obligatoire dans WebRTC) | ✅ |
| Arrêt de la session à tout moment, des deux côtés | ✅ |
| Partage d'écran depuis un **ordinateur** (Chrome, Edge, Firefox) | ✅ |
| Visionner depuis un téléphone | ✅ |
| Partage d'écran depuis un **navigateur mobile** | ❌ non supporté par Android Chrome (`getDisplayMedia` absent) |

## Ce qui nécessite l'application Android native

| Fonction | Fichiers | État |
|---|---|---|
| Capture d'écran du téléphone (MediaProjection + service au premier plan) | `android-native/…/AymanScreenCapturePlugin.kt`, `ScreenCaptureService.kt` | Code fourni, à compiler et tester sur appareil |
| Contrôle à distance (toucher/glisser) | — | **Non implémenté.** Exige un `AccessibilityService` activé manuellement par l'utilisateur et une validation Google Play spécifique. |
| Réseaux mobiles stricts (NAT symétrique) | variables `VITE_TURN_*` | Nécessite votre propre serveur TURN (ex. coturn) |

## Étapes (une seule fois, sur votre ordinateur)

1. Exportez le projet vers GitHub (bouton GitHub dans Lovable), puis clonez-le.
2. `bun install`
3. Publiez l'app web, puis dans `capacitor.config.ts` décommentez `server.url` avec votre URL publiée.
   (TanStack Start est rendu côté serveur : l'app Android charge donc la version publiée.)
4. `bunx cap add android`
5. Fusionnez `android-native/AndroidManifest.additions.xml` dans `android/app/src/main/AndroidManifest.xml`.
6. Dans `android/app/build.gradle`, ajoutez :
   ```gradle
   implementation "io.github.webrtc-sdk:android:125.6422.07"
   ```
7. Dans `android/app/src/main/java/.../MainActivity.java` :
   ```java
   @Override
   public void onCreate(Bundle savedInstanceState) {
     registerPlugin(com.ayman.remote.AymanScreenCapturePlugin.class);
     super.onCreate(savedInstanceState);
   }
   ```
8. Copiez les fichiers Kotlin dans `android/app/src/main/java/com/ayman/remote/` et activez Kotlin dans Gradle si nécessaire.
9. `bunx cap sync android` puis committez le dossier `android/`.

Ensuite, chaque `push` sur `main` lance `.github/workflows/android.yml`, qui produit un APK téléchargeable dans l'onglet **Actions → ayman-remote-apk**.

### Secrets GitHub à créer
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (valeurs du fichier `.env` du projet).

## Sécurité
- Aucun partage sans accord : le web demande `getDisplayMedia`, Android affiche sa propre boîte MediaProjection.
- Notification permanente pendant le partage (exigence Android).
- Le serveur ne relaie que la signalisation ; la vidéo circule en pair-à-pair chiffré.
