import type { Metadata } from "next";
import "./globals.css";
import Sidebar from '../components/Sidebar';

export const metadata: Metadata = {
  title: "RoomBook — Meeting Room Booking",
  description: "Book meeting rooms quickly and reliably",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen lg:ml-60">
          <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
            {children}
          </main>
          <footer className="border-t border-slate-200 px-8 py-4 text-xs text-slate-400 flex items-center justify-between">
            <span>RoomBook</span>
            <span>All times displayed in UTC</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
