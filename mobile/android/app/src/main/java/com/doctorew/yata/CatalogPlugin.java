package com.doctorew.yata;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Public catalog reads only. Preserve raw bytes for the shared SHA-256 check. */
@CapacitorPlugin(name = "YataCatalog")
public class CatalogPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    @PluginMethod
    public void read(PluginCall call) {
        String path = call.getString("path", "");
        String captionUrl = call.getString("captionUrl", "");
        String target;
        int byteLimit;
        if (!captionUrl.isEmpty()) {
            try {
                URL caption = new URL(captionUrl);
                if (!caption.getProtocol().equals("https") || !caption.getHost().equals("archive.org") ||
                    caption.getUserInfo() != null || (caption.getPort() != -1 && caption.getPort() != 443) ||
                    !caption.getPath().matches("/download/[^/]+/.+\\.(vtt|srt)")) throw new Exception();
                target = captionUrl;
                byteLimit = 1000000;
            } catch (Exception error) { call.reject("Unsupported caption URL."); return; }
        } else {
            if (!path.equals("/tv/data/published-catalog-manifest.json") &&
                !path.matches("/tv/data/catalogs/[a-f0-9]{64}\\.json")) {
                call.reject("Unsupported catalog path."); return;
            }
            target = "https://doctorew.com" + path;
            byteLimit = 8000000;
        }
        executor.submit(() -> {
            HttpsURLConnection connection = null;
            try {
                connection = (HttpsURLConnection) new URL(target).openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(12000);
                connection.setReadTimeout(15000);
                if (connection.getResponseCode() != 200) throw new Exception("Catalog server unavailable.");
                try (InputStream stream = connection.getInputStream(); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192];
                    int length;
                    while ((length = stream.read(buffer)) != -1) {
                        if (bytes.size() + length > byteLimit) throw new Exception("Catalog exceeds size limit.");
                        bytes.write(buffer, 0, length);
                    }
                    JSObject result = new JSObject();
                    result.put("text", bytes.toString(StandardCharsets.UTF_8.name()));
                    call.resolve(result);
                }
            } catch (Exception error) { call.reject("Catalog refresh unavailable."); }
            finally { if (connection != null) connection.disconnect(); }
        });
    }
    @Override
    protected void handleOnDestroy() { executor.shutdownNow(); super.handleOnDestroy(); }
}
