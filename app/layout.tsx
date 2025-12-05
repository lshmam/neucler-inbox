import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Autopilot for Clover',
  description: 'Your 24/7 AI-powered business assistant.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 
           NO Sidebar here. 
           NO "flex" classes here.
           Just render children and the Toaster.
        */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}