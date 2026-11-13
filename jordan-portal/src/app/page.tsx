import Link from "next/link";
import { Photo } from "@/components/collage";
import { SiteFrame } from "@/components/site-frame";
import { publicCopy } from "@/lib/content";

export default function HomePage() {
  return (
    <SiteFrame>
      <section className="grid md:grid-cols-2">
        <div className="flex flex-col justify-end px-4 py-16 md:min-h-[70vh] md:px-10 md:py-20">
          <h1 className="text-[32px] leading-[1.15] tracking-[0.08em] md:text-[48px] md:leading-[1.2] md:tracking-[0.1em]">
            Jordan Wang
          </h1>
          <p className="mt-6 max-w-md text-[14px] leading-[20px] tracking-[0.35px]">
            Private transformations, reserved one client at a time. Weddings and
            bridal, planned through a personal inquiry.
          </p>
        </div>
        <Photo name="hero" className="aspect-[4/5] md:aspect-auto md:min-h-[70vh]" />
      </section>
      <section className="grid grid-cols-1 gap-px bg-[#e5e7eb] sm:grid-cols-2">
        <Link href="/transformations" className="bg-white">
          <Photo name="blonding" />
          <div className="px-4 py-4">
            <p className="text-[12px] uppercase tracking-[0.05em] text-[#6a6a6a]">Studio</p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.05em]">Private Transformations</p>
            <p className="mt-1 text-[12px] tracking-[0.3px]">{publicCopy.minimum}</p>
          </div>
        </Link>
        <Link href="/weddings" className="bg-white">
          <Photo name="bridal" />
          <div className="px-4 py-4">
            <p className="text-[12px] uppercase tracking-[0.05em] text-[#6a6a6a]">Studio</p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.05em]">Weddings & Bridal</p>
            <p className="mt-1 text-[12px] tracking-[0.3px]">Inquire</p>
          </div>
        </Link>
      </section>
    </SiteFrame>
  );
}
