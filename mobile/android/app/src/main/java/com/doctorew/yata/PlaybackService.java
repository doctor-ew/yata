package com.doctorew.yata;

import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

/** Audio playback belongs to a foreground media service, independent of the WebView. */
@androidx.annotation.OptIn(markerClass = androidx.media3.common.util.UnstableApi.class)
public class PlaybackService extends MediaSessionService {
    private MediaSession session;
    static String queueJson = "[]";
    @Override public void onCreate() {
        super.onCreate();
        DefaultTrackSelector selector = new DefaultTrackSelector(this);
        selector.setParameters(selector.buildUponParameters().setTrackTypeDisabled(C.TRACK_TYPE_VIDEO, true));
        ExoPlayer player = new ExoPlayer.Builder(this).setTrackSelector(selector).build();
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true);
        player.setHandleAudioBecomingNoisy(true);
        player.setWakeMode(C.WAKE_MODE_LOCAL);
        session = new MediaSession.Builder(this, player).build();
    }
    @Override public MediaSession onGetSession(MediaSession.ControllerInfo controller) { return session; }
    @Override public void onDestroy() {
        if (session != null) { session.getPlayer().release(); session.release(); session = null; }
        queueJson = "[]";
        super.onDestroy();
    }
}
