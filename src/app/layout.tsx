import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Space_Mono,
  JetBrains_Mono,
  Courier_Prime,
  IBM_Plex_Mono,
} from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });
// Témata z Invoicingu; preload jen pro výchozí Geist, ostatní až při výběru.
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  preload: false,
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "latin-ext"],
  preload: false,
});
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  preload: false,
});
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  preload: false,
});

const fontVariables = [
  geistSans.variable,
  geistMono.variable,
  spaceMono.variable,
  jetbrainsMono.variable,
  courierPrime.variable,
  ibmPlexMono.variable,
].join(" ");

/** Nastaví téma a režim před prvním vykreslením, aby stránka neproblikla. */
const THEME_BOOTSTRAP = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("app-theme");var ok=["default","space-mono","jetbrains-mono","courier-prime","ibm-plex-mono"];if(t&&ok.indexOf(t)!==-1){d.setAttribute("data-theme",t);}if(localStorage.getItem("app-color-scheme")==="light"){d.classList.remove("dark");}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Media Diary",
  description: "Your personal movie diary with AI recommendations",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Media Diary",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="cs" className="dark h-full" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        </head>
        <body
          className={`${fontVariables} min-h-full flex flex-col overflow-x-clip bg-background antialiased`}
          suppressHydrationWarning
        >
          <ThemeProvider>
            <ColorSchemeProvider>{children}</ColorSchemeProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
