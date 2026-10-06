'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function QrScannerModal({
  isOpen,
  title = 'เปิดกล้องสแกน QR Code',
  description = 'หันกล้องไปที่ QR Code เพื่อสแกน',
  onScanSuccess,
  onClose,
}: QrScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = useRef(`reader-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    setIsStarting(true);
    setErrorMsg(null);

    // Give DOM a tick to render elementId
    const timer = setTimeout(async () => {
      try {
        const domEl = document.getElementById(elementId.current);
        if (!domEl) return;

        const html5QrCode = new Html5Qrcode(elementId.current, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const qrCodeSuccessCallback = (decodedText: string) => {
          // Play a small haptic feedback if supported on mobile
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          // Stop camera before closing
          html5QrCode
            .stop()
            .then(() => {
              html5QrCode.clear();
              if (isMounted) onScanSuccess(decodedText);
            })
            .catch(() => {
              if (isMounted) onScanSuccess(decodedText);
            });
        };

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          () => {
            // Frame scan failure (ignore frequent ticks)
          }
        );

        if (isMounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        console.error('QR Scanner Start Error:', err);
        if (isMounted) {
          setIsStarting(false);
          setErrorMsg(
            err.name === 'NotAllowedError'
              ? 'กรุณาอนุญาตสิทธิ์การเข้าถึงกล้องในเบราว์เซอร์'
              : 'ไม่สามารถเปิดกล้องได้ หรืออุปกรณ์ไม่รองรับ'
          );
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => {
              scannerRef.current?.clear();
            })
            .catch((err) => console.warn('Error stopping scanner:', err));
        }
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">{title}</h3>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Scanner Box */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <div id={elementId.current} className="w-full h-full" />

          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm">กำลังเปิดกล้อง...</p>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 bg-slate-950 text-center">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-sm text-rose-300 font-medium">{errorMsg}</p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          )}

          {/* Scanner overlay frame */}
          {!isStarting && !errorMsg && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-60 h-60 border-2 border-dashed border-emerald-400/80 rounded-2xl relative animate-pulse">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            วาง QR Code ให้อยู่กึ่งกลางกรอบสี่เหลี่ยมเพื่ออ่านข้อมูลอัตโนมัติ
          </p>
        </div>
      </div>
    </div>
  );
}
