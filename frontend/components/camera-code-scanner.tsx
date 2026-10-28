"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Detector = { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;
type ScannerWindow = Window & typeof globalThis & { BarcodeDetector?: DetectorConstructor };

export function CameraCodeScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const t = useTranslations("inventory");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stopCamera = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const close = () => {
    stopCamera();
    setOpen(false);
  };

  useEffect(() => () => stopCamera(), []);

  async function openCamera() {
    setMessage(null);
    const DetectorClass = (window as ScannerWindow).BarcodeDetector;
    if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
      setMessage(t("cameraUnavailable"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setOpen(true);
      window.setTimeout(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new DetectorClass({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar"] });
        timerRef.current = window.setInterval(async () => {
          try {
            const codes = await detector.detect(video as unknown as ImageBitmapSource);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              onDetected(value);
              close();
            }
          } catch {
            // Frames can be incomplete while the camera is focusing; continue scanning.
          }
        }, 300);
      }, 0);
    } catch {
      setMessage(t("cameraPermission"));
    }
  }

  return <span className="relative inline-flex shrink-0">
    <button type="button" onClick={openCamera} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"><Camera className="h-4 w-4" />{t("scanCamera")}</button>
    {message ? <span role="alert" className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-800 shadow-lg">{message}</span> : null}
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label={t("scanCamera")}><div className="w-full max-w-lg overflow-hidden rounded-2xl bg-slate-950 shadow-2xl"><div className="flex items-center justify-between px-4 py-3 text-white"><div><p className="font-black">{t("scanCamera")}</p><p className="text-xs text-slate-300">{t("cameraHint")}</p></div><button type="button" onClick={close} aria-label={t("closeCamera")} className="rounded-lg p-2 hover:bg-white/10"><X className="h-5 w-5" /></button></div><div className="relative aspect-[4/3] bg-black"><video ref={videoRef} muted playsInline className="h-full w-full object-cover" /><div className="pointer-events-none absolute inset-[18%_10%] rounded-xl border-2 border-brand shadow-[0_0_0_9999px_rgba(15,23,42,.25)]" /></div><button type="button" onClick={close} className="m-4 rounded-lg border border-slate-600 px-4 py-2 text-sm font-bold text-white">{t("closeCamera")}</button></div></div> : null}
  </span>;
}
