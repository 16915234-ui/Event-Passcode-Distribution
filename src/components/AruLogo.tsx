import Image from 'next/image';
export default function AruLogo({className=''}:{className?:string}) {
  return <span className={`inline-block h-10 w-[102px] shrink-0 overflow-hidden bg-white ${className}`}><Image src="/brand/aru-secondary.png" alt="ARU มหาวิทยาลัยราชภัฏพระนครศรีอยุธยา" width={746} height={152} className="h-full w-auto max-w-none" priority/></span>;
}
