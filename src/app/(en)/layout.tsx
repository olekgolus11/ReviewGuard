import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { CookiebotScript } from "../_consent/CookiebotScript";
import "../globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function EnglishRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <CookiebotScript locale="en" />
      </body>
    </html>
  );
}
