'use client';
import Link from 'next/link';
import { Tv, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Notice, PageHeading } from '@/components/feedback';
import { useResource } from '@/lib/client-api';
import type { Event } from '@/types';
export default function DisplayIndex() {const {data,error}=useResource<{events:Event[]}>('/api/events');return <><PageHeading eyebrow="Projector mode" title="จอแสดงผลกิจกรรม" description="เลือกกิจกรรมเพื่อแสดง QR Code และยอดผู้เข้าร่วมบนจอโปรเจคเตอร์"/><Notice text={error}/><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data?.events.map(e=><Card key={e.id}><Tv className="mb-5 text-gold"/><h2 className="mb-6 font-bold">{e.name}</h2><Button variant="outline" asChild><Link href={`/display/${e.id}`}>เปิดจอแสดงผล<ArrowUpRight/></Link></Button></Card>)}</div>{data?.events.length===0&&<Card>ยังไม่มีกิจกรรม กรุณาสร้างกิจกรรมในหน้าผู้ดูแลระบบ</Card>}</>;}
