const fs = require('fs');

// 1. Update QrScannerModal.tsx
let modalCode = `
'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from './ui/button';

export default function QrScannerModal({ isOpen, onScanSuccess, onClose }: { isOpen: boolean; onScanSuccess:(value:string)=>void; onClose:()=>void }) {
  const id = useId().replaceAll(':',''); const dialog = useRef<HTMLDialogElement>(null);
  const [error,setError]=useState(''); const [starting,setStarting]=useState(true);
  const callback=useRef(onScanSuccess); const close=useRef(onClose);
  const lastScan = useRef<{text:string, time:number}>({text:'', time:0});
  
  useEffect(()=>{ callback.current=onScanSuccess;close.current=onClose; },[onScanSuccess,onClose]);
  
  useEffect(()=>{
    if(!isOpen)return;
    let cancelled=false;
    let scanner: import('html5-qrcode').Html5Qrcode | undefined;
    const element = dialog.current;
    element?.showModal();
    
    const start=async()=>{
      setError('');setStarting(true);
      try { 
        const {Html5Qrcode,Html5QrcodeSupportedFormats}=await import('html5-qrcode');
        if(cancelled)return;
        scanner=new Html5Qrcode(id,{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
        await scanner.start({facingMode:'environment'},{fps:30,qrbox:(w,h)=>({width:Math.min(w,h,250)*.85,height:Math.min(w,h,250)*.85})},text=>{
          if(cancelled)return;
          const now = Date.now();
          if (lastScan.current.text !== text || now - lastScan.current.time > 2000) {
            lastScan.current = { text, time: now };
            callback.current(text);
          }
        },()=>{});
        if(cancelled) { if(scanner.isScanning)await scanner.stop();scanner.clear();return;}
        setStarting(false);
      }catch{if(!cancelled){setStarting(false);setError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตกล้องและใช้ HTTPS หรือติดต่อทีมงาน');}}
    };
    void start();
    return()=>{cancelled=true;element?.close();if(scanner?.isScanning)void scanner.stop().then(()=>scanner?.clear()).catch(()=>{});};
  },[isOpen,id]);
  
  if(!isOpen)return null;
  return <dialog ref={dialog} onCancel={e=>{e.preventDefault();close.current();}} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-5 text-foreground shadow-xl backdrop:bg-black/60"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Camera size={20}/>สแกน QR Code (ต่อเนื่อง)</h2><Button variant="ghost" size="icon" autoFocus aria-label="ปิดกล้อง" onClick={onClose}><X/></Button></div><div id={id} className="min-h-64 overflow-hidden rounded-xl bg-muted"/>{starting&&<p className="mt-3 text-sm">กำลังเปิดกล้อง...</p>}{error&&<p role="alert" className="mt-3 text-sm text-primary">{error}</p>}<p className="mt-4 text-xs leading-6 text-muted-foreground">ระบบจะสแกนต่อเนื่อง สามารถสแกนบัตรนักศึกษาใบถัดไปได้ทันที</p></dialog>;
}
`;
fs.writeFileSync('src/components/QrScannerModal.tsx', modalCode);

// 2. Update staff/page.tsx
let staffCode = fs.readFileSync('src/app/staff/page.tsx', 'utf-8');
staffCode = staffCode.replace(`const [scan,setScan]=useState(false);const [busy,setBusy]=useState(false);const [query,setQuery]=useState('');const [message,setMessage]=useState('');const [failure,setFailure]=useState('');const [candidate,setCandidate]=useState<Registration|null>(null);`, `const [scan,setScan]=useState(false);const [busy,setBusy]=useState(false);const [query,setQuery]=useState('');const [message,setMessage]=useState('');const [failure,setFailure]=useState('');const [candidate,setCandidate]=useState<Registration|null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const playBeep = (success: boolean) => {
    try {
      if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContext.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      if (success) {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      }
    } catch(e) {}
  };`);

staffCode = staffCode.replace(`const checkIn=async(body:object)=>{setScan(false);setBusy(true);setFailure('');setMessage('');try{const result=await api<{message:string}>('/api/checkin/staff',{eventId:id,...body});setMessage(result.message);setCandidate(null);await refresh();}catch(e){setFailure(errorText(e));}finally{setBusy(false);}};`, `const checkIn=async(body:any)=>{if(body.method!=='STAFF_SCAN')setScan(false);setBusy(true);setFailure('');setMessage('');try{const result=await api<{message:string}>('/api/checkin/staff',{eventId:id,...body});setMessage(result.message);setCandidate(null);await refresh();if(body.method==='STAFF_SCAN')playBeep(true);}catch(e){setFailure(errorText(e));if(body.method==='STAFF_SCAN')playBeep(false);}finally{setBusy(false);}};`);

if (!staffCode.includes('useRef')) {
  staffCode = staffCode.replace(`import { useState } from 'react';`, `import { useState, useRef } from 'react';`);
}

fs.writeFileSync('src/app/staff/page.tsx', staffCode);
console.log('Scanner updated');
