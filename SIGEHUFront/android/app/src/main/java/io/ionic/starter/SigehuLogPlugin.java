package io.ionic.starter;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plugin nativo de logging para SIGEHU.
 *
 * Escribe cada entrada directamente en Logcat con la tag "SIGEHU", de modo que
 * el log del renderer sea visible en la terminal/ADB aunque la build de
 * producción elimine las llamadas a console.*.
 */
@CapacitorPlugin(name = "SigehuLog")
public class SigehuLogPlugin extends Plugin {

    private static final String TAG = "SIGEHU";

    @PluginMethod
    public void write(PluginCall call) {
        String level = call.getString("level", "INFO");
        String category = call.getString("category", "SYS");
        String message = call.getString("message", "");

        String line = "[" + category + "] " + message;

        switch (level) {
            case "ERROR":
                Log.e(TAG, line);
                break;
            case "WARN":
                Log.w(TAG, line);
                break;
            case "DEBUG":
                Log.d(TAG, line);
                break;
            default:
                Log.i(TAG, line);
                break;
        }

        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }
}
