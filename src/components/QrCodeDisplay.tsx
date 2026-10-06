'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
  bgColor?: string;
  fgColor?: string;
}

export default function QrCodeDisplay({
  value,
  size = 240,
  level = 'M',
  includeMargin = true,
  className = '',
  bgColor = '#ffffff',
  fgColor = '#0f172a',
}: QrCodeDisplayProps) {
  if (!value) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs text-center p-4"
      >
        กำลังโหลด QR Code...
      </div>
    );
  }

  return (
    <div
      className={`inline-block p-3 bg-white rounded-2xl shadow-xl transition-all duration-300 ${className}`}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        bgColor={bgColor}
        fgColor={fgColor}
        includeMargin={includeMargin}
      />
    </div>
  );
}
