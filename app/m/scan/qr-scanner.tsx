"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { validateCheckinToken, Reservation } from "../../actions";

type ScanState =
  | { status: "idle" }
  | { status: "scanning" }
  | { status: "processing" }
  | { status: "success"; reservation: Reservation }
  | { status: "error"; message: string; reservation?: Reservation };

export function QRScanner() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>({ status: "idle" });
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    // Prevent multiple scans while processing
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Parse QR data
    if (!decodedText.startsWith("checkin:")) {
      setScanState({ status: "error", message: "QR no reconocido. Debe ser un QR de reserva Servana." });
      isProcessingRef.current = false;
      return;
    }

    const token = decodedText.replace("checkin:", "");

    // Stop scanner while processing
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
    }

    setScanState({ status: "processing" });

    try {
      const result = await validateCheckinToken(token);

      if (result.success && result.reservation) {
        setScanState({ status: "success", reservation: result.reservation });
        // Vibrate on success (if supported)
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
      } else {
        setScanState({
          status: "error",
          message: result.error || "Error desconocido",
          reservation: result.reservation
        });
      }
    } catch (err) {
      setScanState({ status: "error", message: "Error de conexion. Intenta de nuevo." });
    }

    isProcessingRef.current = false;
  }, []);

  const startScanner = useCallback(async () => {
    setScanState({ status: "scanning" });

    try {
      // Check camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission("granted");

      // Initialize scanner
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        handleScanSuccess,
        () => {} // Ignore errors (no QR found)
      );
    } catch (err: unknown) {
      console.error("Camera error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("Permission") || errorMessage.includes("NotAllowed")) {
        setCameraPermission("denied");
        setScanState({ status: "error", message: "Permiso de camara denegado. Activa la camara en ajustes." });
      } else {
        setScanState({ status: "error", message: "No se pudo acceder a la camara." });
      }
    }
  }, [handleScanSuccess]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanState({ status: "idle" });
    isProcessingRef.current = false;
  }, []);

  const resetScanner = useCallback(() => {
    setScanState({ status: "idle" });
    isProcessingRef.current = false;
  }, []);

  const formatTime = (dateStr: string, tz: string) => {
    return new Date(dateStr).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  };

  const formatDate = (dateStr: string, tz: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: tz,
    });
  };

  const handleExit = useCallback(async () => {
    // Stop scanner before navigating to prevent memory leaks
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
      scannerRef.current = null;
    }
    router.push("/m/reservas");
  }, [router]);

  // Check if showing result (success or error)
  const showingResult = scanState.status === "success" || scanState.status === "error";

  return (
    <div className="space-y-4">
      {/* Result cards - shown at top when there's a result */}
      {scanState.status === "success" && scanState.reservation && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-full text-emerald-600 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                Llegada registrada
              </h3>
              <div className="space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
                <p className="font-medium text-lg">{scanState.reservation.name}</p>
                <p>{scanState.reservation.party_size} personas</p>
                <p>{formatTime(scanState.reservation.datetime_utc, scanState.reservation.tz || "Europe/Zurich")}</p>
                <p className="text-xs opacity-75 capitalize">
                  {formatDate(scanState.reservation.datetime_utc, scanState.reservation.tz || "Europe/Zurich")}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={resetScanner}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
            >
              Escanear otro
            </button>
            <button
              onClick={handleExit}
              className="flex-1 py-3 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      )}

      {scanState.status === "error" && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full text-red-600 dark:text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {scanState.message}
              </p>
              {scanState.reservation && (
                <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  <p className="font-medium">{scanState.reservation.name}</p>
                  <p>{scanState.reservation.party_size} personas - {formatTime(scanState.reservation.datetime_utc, scanState.reservation.tz || "Europe/Zurich")}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={resetScanner}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={handleExit}
              className="flex-1 py-3 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      )}

      {/* Scanner area - smaller when showing result */}
      <div className={`relative bg-black rounded-2xl overflow-hidden mx-auto ${showingResult ? 'aspect-video max-w-xs' : 'aspect-square max-w-sm'}`}>
        {/* QR Reader container */}
        <div id="qr-reader" className="w-full h-full" />

        {/* Overlay states */}
        {scanState.status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <button
              onClick={startScanner}
              className="flex flex-col items-center gap-3 p-8 text-white"
            >
              <div className="p-4 bg-indigo-600 rounded-full">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <span className="text-lg font-medium">Iniciar escaner</span>
              <span className="text-sm text-zinc-400">Toca para activar la camara</span>
            </button>
          </div>
        )}

        {scanState.status === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90">
            <div className="flex flex-col items-center gap-3 text-white">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
              <span className="text-lg">Verificando...</span>
            </div>
          </div>
        )}

        {scanState.status === "scanning" && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <button
              onClick={stopScanner}
              className="px-4 py-2 bg-black/60 text-white rounded-full text-sm backdrop-blur"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Permission denied help */}
      {cameraPermission === "denied" && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Para usar el escaner, activa el permiso de camara en los ajustes del navegador.
          </p>
        </div>
      )}

      {/* Instructions */}
      {scanState.status === "idle" && (
        <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 space-y-2">
          <p>Enfoca el QR de la reserva del cliente.</p>
          <p>El check-in se realizara automaticamente.</p>
        </div>
      )}
    </div>
  );
}
