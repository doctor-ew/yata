package com.doctorew.yata;

import android.content.ComponentName;
import android.net.Uri;
import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.google.common.util.concurrent.ListenableFuture;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "YataAudio")
public class BackgroundAudioPlugin extends Plugin {
    private MediaController controller;
    private ListenableFuture<MediaController> connection;
    private void withController(PluginCall call, Runnable action) {
        getActivity().runOnUiThread(() -> {
            if (controller != null) { action.run(); return; }
            if (connection == null) connection = new MediaController.Builder(getContext(), new SessionToken(getContext(), new ComponentName(getContext(), PlaybackService.class))).buildAsync();
            connection.addListener(() -> { try { controller = connection.get(); action.run(); } catch (Exception error) { call.reject("Background player could not connect."); } }, ContextCompat.getMainExecutor(getContext()));
        });
    }
    @PluginMethod public void play(PluginCall call) {
        ArrayList<MediaItem> items = new ArrayList<>();
        try {
            JSONArray rows = call.getArray("items");
            if (rows == null || rows.length() < 1 || rows.length() > 50) throw new Exception();
            for (int i=0; i<rows.length(); i++) {
                JSONObject row = rows.getJSONObject(i);
                Uri uri = Uri.parse(row.getString("url"));
                if (!"https".equals(uri.getScheme()) || !"archive.org".equals(uri.getHost()) || !uri.getPath().startsWith("/download/") || !uri.getPath().toLowerCase().endsWith(".mp4")) throw new Exception();
                items.add(new MediaItem.Builder().setMediaId(String.valueOf(i)).setUri(uri).setMediaMetadata(new MediaMetadata.Builder().setTitle(row.getString("title")).setArtist(row.getString("showTitle")).build()).build());
            }
        } catch (Exception error) { call.reject("Only public Archive video episodes can play in background."); return; }
        Double seconds = call.getDouble("seconds", 0.0);
        if (!Double.isFinite(seconds) || seconds < 0 || seconds > 86400) { call.reject("Invalid playback position."); return; }
        withController(call, () -> {
            PlaybackService.queueJson = call.getArray("items").toString();
            controller.setMediaItems(items, 0, (long)(seconds*1000)); controller.prepare(); controller.play(); call.resolve(state());
        });
    }
    private JSObject state() {
        JSObject result = new JSObject();
        result.put("active", controller != null && controller.getMediaItemCount() > 0);
        result.put("index", controller != null ? controller.getCurrentMediaItemIndex() : 0);
        result.put("seconds", controller != null ? controller.getCurrentPosition()/1000.0 : 0);
        result.put("playing", controller != null && controller.isPlaying());
        result.put("title", controller != null && controller.getMediaMetadata().title != null ? controller.getMediaMetadata().title.toString() : "");
        result.put("error", controller != null && controller.getPlayerError() != null ? "This source could not play in background." : "");
        try { result.put("items", new JSArray(PlaybackService.queueJson)); } catch (Exception ignored) { result.put("items", new JSArray()); }
        return result;
    }
    @PluginMethod public void status(PluginCall call) { withController(call, () -> call.resolve(state())); }
    @PluginMethod public void stop(PluginCall call) { getActivity().runOnUiThread(() -> { JSObject current = state(); if (controller != null) { controller.pause(); controller.clearMediaItems(); } call.resolve(current); }); }
}
