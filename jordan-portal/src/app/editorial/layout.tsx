import { Barlow, Caveat_Brush } from "next/font/google";
import "./zine.css";

const sans = Barlow({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-zine-sans",
});

const marker = Caveat_Brush({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
});

export default function EditorialLayout({ children }: LayoutProps<"/editorial">) {
  return <div className={`${sans.variable} ${marker.variable}`}>{children}</div>;
}
