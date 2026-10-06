import type { Metadata } from 'next';
import './globals.css';


export const metadata: Metadata = {
  title: 'ARU Event Pass | ระบบลงทะเบียนกิจกรรม',
  description:
    'ระบบลงทะเบียนและแจก Passcode กิจกรรม มหาวิทยาลัยราชภัฏพระนครศรีอยุธยา พัฒนาโดย จิรายุทธ บุตรชานนท์',
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
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
