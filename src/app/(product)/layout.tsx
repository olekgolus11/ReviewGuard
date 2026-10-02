import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "../globals.css";
import "./workspace/product.css";

const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "ReviewGuard — przegląd opinii",
  description: "Importuj i porządkuj opinie o swojej lokalizacji.",
};

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="product-body">{children}</body>
    </html>
  );
}
