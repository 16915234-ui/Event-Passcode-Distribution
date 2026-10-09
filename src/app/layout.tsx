import type { Metadata } from 'next';
import './globals.css';
import NetworkActivity from '@/components/NetworkActivity';


export const metadata: Metadata = {
  title: 'ARU Event Pass | ระบบลงทะเบียนกิจกรรม',
  description:
    'ระบบลงทะเบียนและแจก Passcode กิจกรรม มหาวิทยาลัยราชภัฏพระนครศรีอยุธยา พัฒนาโดย จิรายุทธ บุตรชานนท์',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ARU Event Pass',
  },
};

export const viewport = {
  themeColor: '#8e202c',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className="h-full antialiased"
    >
      <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <NetworkActivity/>
      </body>
    </html>
  );
}
