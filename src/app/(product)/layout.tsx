import type { Metadata } from "next";
import "../globals.css";
import "./workspace/product.css";

export const metadata: Metadata = {
  title: "ReviewGuard — przegląd opinii",
  description: "Importuj i porządkuj opinie o swojej lokalizacji.",
};

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="product-body">{children}</body>
    </html>
  );
}
