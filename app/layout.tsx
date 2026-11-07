import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorker from "@/ui/ServiceWorker";

export const metadata: Metadata = {
  title: "Ahom Kingdom Map",
  description: "A source-first animated map documentary of the Ahom Kingdom, 1228–1826.",
  applicationName: "Ahom Kingdom Map",
  appleWebApp: { capable: true, title: "Ahom Map", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#16130f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
