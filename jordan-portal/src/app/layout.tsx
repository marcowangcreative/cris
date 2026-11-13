import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { getConfig } from "@/lib/rules";
import { liveSupabaseConfigured } from "@/lib/supabase/server";
import "./globals.css";

const sans = Inter_Tight({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: { default: "Jordan Wang", template: "%s · Jordan Wang" },
  description:
    "Private transformations and bridal artistry in Houston. A demo studio portal.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const demo = getConfig().demoMode;
  return (
    <html lang="en" className={`${sans.variable} h-full`}>
      <body className="min-h-full bg-white text-black antialiased">
        {demo ? (
          <p className="border-b border-[#e5e7eb] px-4 py-2 text-center text-[12px] uppercase tracking-[0.05em] text-[#6a6a6a]">
            Demo studio. Fictional clients. No live payments, calendars, or email.
            {liveSupabaseConfigured()
              ? " Supabase env vars are present, and this build still uses the local demo database."
              : " Supabase is not connected."}
          </p>
        ) : null}
        {children}
      </body>
    </html>
  );
}
