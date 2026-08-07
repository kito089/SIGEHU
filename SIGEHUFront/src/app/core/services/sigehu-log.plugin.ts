import { registerPlugin } from '@capacitor/core';

/**
 * Interfaz del plugin nativo de Android "SigehuLog" (SigehuLogPlugin.java).
 * Escribe directamente en Logcat con la tag "SIGEHU".
 */
export interface SigehuLogPlugin {
  write(options: { level: string; category: string; message: string }): Promise<{ ok: boolean }>;
}

export const SigehuLog = registerPlugin<SigehuLogPlugin>('SigehuLog');
