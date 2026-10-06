'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from './ui/button';
export default function QrScannerModal({ isOpen, onScanSuccess, onClose }: { isOpen: boolean; onScanSuccess:(value:string)=>void; onClose:()=>void }) {
  const id = useId().replaceAll(':',''); const dialog = useRef<HTMLDialogElement>(null);
  const [error,setError]=useState(''); const [starting,setStarting]=useState(true);
  const callback=useRef(onScanSuccess); const close=useRef(onClose);
  useEffect(()=>{ callback.current=onScanSuccess;close.current=onClose; },[onScanSuccess,onClose]);
  useEffect(()=>{
    if(!isOpen)return;
    let cancelled=false;let scanned=false;
    let scanner: import('html5-qrcode').Html5Qrcode | undefined;
    const element = dialog.current;
    element?.showModal();
    const start=async()=>{
      setError('');setStarting(true);
      try { const {Html5Qrcode,Html5QrcodeSupportedFormats}=await import('html5-qrcode');if(cancelled)return;
        scanner=new Html5Qrcode(id,{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
        await scanner.start({facingMode:'environment'},{fps:12,qrbox:(w,h)=>({width:Math.min(w,h,250)*.85,height:Math.min(w,h,250)*.85})},text=>{if(scanned||cancelled)return;scanned=true;callback.current(text);},()=>{});
        if(cancelled) { if(scanner.isScanning)await scanner.stop();scanner.clear();return;}setStarting(false);
      }catch{if(!cancelled){setStarting(false);setError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตกล้องและใช้ HTTPS หรือติดต่อทีมงาน');}}
    };void start();
    return()=>{cancelled=true;element?.close();if(scanner?.isScanning)void scanner.stop().then(()=>scanner?.clear()).catch(()=>{});};
  },[isOpen,id]);
  if(!isOpen)return null;
  return <dialog ref={dialog} onCancel={e=>{e.preventDefault();close.current();}} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-5 text-foreground shadow-xl backdrop:bg-black/60"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Camera size={20}/>สแกน QR Code</h2><Button variant="ghost" size="icon" autoFocus aria-label="ปิดกล้อง" onClick={onClose}><X/></Button></div><div id={id} className="min-h-64 overflow-hidden rounded-xl bg-muted"/>{starting&&<p className="mt-3 text-sm">กำลังเปิดกล้อง...</p>}{error&&<p role="alert" className="mt-3 text-sm text-primary">{error}</p>}<p className="mt-4 text-xs leading-6 text-muted-foreground">วาง QR Code ให้อยู่กึ่งกลางภาพ ระบบจะอ่านโดยอัตโนมัติ</p></dialog>;
}
