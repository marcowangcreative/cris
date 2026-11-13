import { Barlow, Berkshire_Swash, Permanent_Marker } from "next/font/google";
import "./zine.css";

const sans = Barlow({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-zine-sans",
});

const script = Berkshire_Swash({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
});

const marker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
});

export default function EditorialLayout({ children }: LayoutProps<"/editorial">) {
  return <div className={`${sans.variable} ${script.variable} ${marker.variable}`}>{children}</div>;
}
