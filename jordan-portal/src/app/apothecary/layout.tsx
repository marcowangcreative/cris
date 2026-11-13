import { EB_Garamond, Jost } from "next/font/google";
import "./apothecary.css";

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jost",
});

export default function ApothecaryLayout({ children }: LayoutProps<"/apothecary">) {
  return <div className={`${garamond.variable} ${jost.variable}`}>{children}</div>;
}
