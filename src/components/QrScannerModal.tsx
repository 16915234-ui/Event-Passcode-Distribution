
'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from './ui/button';
import { LoadingStatus } from './loading';

export default function QrScannerModal({ isOpen, onScanSuccess, onClose, processing=false, feedback, feedbackError=false }: { isOpen: boolean; processing?: boolean; feedback?: string; feedbackError?: boolean; onScanSuccess:(value:string)=>void; onClose:()=>void }) {
  const id = useId().replaceAll(':',''); const dialog = useRef<HTMLDialogElement>(null);
  const [error,setError]=useState(''); const [starting,setStarting]=useState(true);
  const callback=useRef(onScanSuccess); const close=useRef(onClose);
  const pending=useRef(processing);
  useEffect(()=>{pending.current=processing;},[processing]);
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
          if(cancelled||pending.current)return;
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
  return <dialog ref={dialog} onCancel={e=>{e.preventDefault();close.current();}} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-5 text-foreground shadow-xl backdrop:bg-black/60"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Camera size={20}/>สแกน QR Code (ต่อเนื่อง)</h2><Button variant="ghost" size="icon" autoFocus aria-label="ปิดกล้อง" onClick={onClose}><X/></Button></div><div id={id} className="min-h-64 overflow-hidden rounded-xl bg-muted"/>{processing&&<LoadingStatus label="กำลังยืนยันการเช็คอิน…"/>}{feedback&&<p role="status" className={`mt-3 rounded-lg p-3 text-sm ${feedbackError?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>{feedback}</p>}{starting&&<LoadingStatus label="กำลังเปิดกล้อง กรุณารอสักครู่…"/>}{error&&<p role="alert" className="mt-3 text-sm text-primary">{error}</p>}<p className="mt-4 text-xs leading-6 text-muted-foreground">ระบบจะสแกนต่อเนื่อง สามารถสแกนบัตรนักศึกษาใบถัดไปได้ทันที</p></dialog>;
}
