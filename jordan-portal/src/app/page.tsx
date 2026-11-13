import Link from "next/link";
import {
  Botanical,
  BottleSticker,
  BubbleSticker,
  Crest,
  EnvelopeSticker,
  HouseSticker,
  Squiggle,
  Wordmark,
} from "@/components/collage";
import { SiteFrame } from "@/components/site-frame";
import { publicCopy } from "@/lib/content";

export default function HomePage() {
  return (
    <SiteFrame>
      <section className="relative mx-auto w-full max-w-6xl px-6 pb-8 pt-4">
        <p className="font-script text-4xl text-wine md:text-5xl">chaotic to chaotique</p>
        <Wordmark as="h1" className="mt-2 whitespace-nowrap text-[clamp(2.6rem,6.4vw,6.1rem)]" />
        <div className="mt-4 flex items-center gap-4">
          <Squiggle className="h-6 w-28" />
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-garden">Houston</p>
        </div>

        <div className="relative mt-8 min-h-[34rem]">
          <div className="stripes absolute inset-x-8 top-10 h-72 rounded-[2rem] opacity-80" />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
            <div className="sticker arch w-64 overflow-hidden border-[3px] border-white bg-paper shadow-[8px_10px_0_rgba(20,61,46,0.18)] md:mt-10">
              <Botanical />
              <p className="bg-card px-3 py-2 text-center text-[0.62rem] uppercase tracking-[0.18em] text-garden">
                Illustrated studio plate
              </p>
            </div>
            <div className="relative grid w-full max-w-sm grid-cols-2 gap-4 md:mt-6">
              <BottleSticker />
              <BubbleSticker />
              <HouseSticker />
              <EnvelopeSticker />
              <div className="sticker col-span-2 rotate-[-2deg] border-2 border-ink bg-persimmon px-4 py-3 text-center text-paper">
                <p className="text-[0.62rem] uppercase tracking-[0.2em]">Minimum investment</p>
                <p className="font-serif text-4xl">{publicCopy.minimum}</p>
              </div>
            </div>
          </div>
          <Crest className="absolute right-2 top-0 hidden h-20 w-20 md:block" />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:gap-16">
        <Link href="/transformations" className="group block">
          <div className="checks flex min-h-80 flex-col justify-between p-8 md:min-h-[28rem] md:p-12">
            <p className="text-[0.68rem] uppercase tracking-[0.22em]">01 · The day</p>
            <div>
              <h2 className="font-serif text-5xl leading-[0.9] md:text-6xl">
                Private Transformations
              </h2>
              <p className="mt-6 max-w-sm text-sm leading-6">
                Cut, color, and a finished style. Minimum investment {publicCopy.minimum}.
                One client each day, starting at 10:00 a.m.
              </p>
            </div>
          </div>
        </Link>
        <Link href="/weddings" className="group block md:mt-16">
          <div className="flex min-h-80 flex-col justify-between bg-blush p-8 md:min-h-[28rem] md:p-12">
            <p className="text-[0.68rem] uppercase tracking-[0.22em]">02 · The celebration</p>
            <div>
              <h2 className="font-serif text-5xl leading-[0.9] md:text-6xl">Weddings & Bridal</h2>
              <p className="mt-6 max-w-sm text-sm leading-6">
                Hair, makeup, or a full bridal journey, shaped in consultation.
                An inquiry does not reserve a date.
              </p>
            </div>
          </div>
        </Link>
      </section>
    </SiteFrame>
  );
}
