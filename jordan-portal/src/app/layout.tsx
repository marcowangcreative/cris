import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { getConfig } from "@/lib/rules";
import { liveSupabaseConfigured } from "@/lib/supabase/server";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
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
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} h-full`}
    >
      <body className="min-h-full bg-paper text-ink antialiased">
        {demo ? (
          <p className="bg-ink px-4 py-2 text-center text-xs tracking-wide text-paper">
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
