import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./maison.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-maison-serif",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-maison-sans",
});

export default function MaisonLayout({ children }: LayoutProps<"/maison">) {
  return <div className={`${serif.variable} ${sans.variable}`}>{children}</div>;
}
