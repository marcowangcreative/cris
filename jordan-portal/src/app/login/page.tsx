import Link from "next/link";
import { Crest, Wordmark } from "@/components/collage";
import { SiteFrame } from "@/components/site-frame";
import { Flash, Kicker, SubmitButton } from "@/components/ui";
import { IDS } from "@/lib/ids";
import { demoSignIn, requestMagicLink } from "@/server/actions";

export const metadata = { title: "Sign in" };

const people = [
  [IDS.avery, "Avery Lin", "Transformation, proposal waiting"],
  [IDS.quinn, "Quinn Harper", "Intake still open"],
  [IDS.sage, "Sage Romero", "Wedding inquiry"],
  [IDS.reese, "Reese Calder", "Confirmed wedding"],
  [IDS.noah, "Noah Blake", "Payment did not confirm"],
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; magic?: string }>;
}) {
  const query = await searchParams;
  const magic = query.magic;
  return (
    <SiteFrame>
      <article className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-8 md:grid-cols-[0.9fr_1.1fr]">
        <section className="engraved bg-card p-8 md:p-10">
          <Crest className="h-16 w-16" />
          <Kicker>Client portal</Kicker>
          <h1 className="mt-3 font-serif text-5xl leading-[0.9]">A private link, shown here.</h1>
          <p className="font-script text-3xl text-wine">no envelope is sent</p>
          <p className="mt-4 max-w-md text-sm leading-6 text-ink-soft">
            In a live studio this would email a magic link. Demo mode shows the
            link on this page instead. No message is sent.
          </p>
          <form action={requestMagicLink} className="mt-8 space-y-4">
            <label className="block text-sm">
              <span className="mb-2 block text-[0.68rem] uppercase tracking-[0.18em] text-garden">
                Email
              </span>
              <input name="email" type="email" required placeholder="avery.lin@example.com" />
            </label>
            <SubmitButton>Create a magic link</SubmitButton>
          </form>
          {magic ? (
            <p className="mt-6 text-sm">
              <Link href={`/auth/magic?token=${encodeURIComponent(magic)}`} className="text-wine underline">
                Open your demo magic link
              </Link>
            </p>
          ) : null}
          <div className="mt-6">
            <Flash error={query.error} />
          </div>
        </section>
        <section className="md:pt-8">
          <Wordmark className="text-4xl" />
          <Kicker>Demo profiles</Kicker>
          <ul className="mt-6 space-y-3">
            {people.map(([id, name, note]) => (
              <li key={id} className="invite-card flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-serif text-2xl">{name}</p>
                  <p className="text-sm text-stone">{note}</p>
                </div>
                <form action={demoSignIn}>
                  <input type="hidden" name="clientId" value={id} />
                  <button type="submit" className="text-[0.68rem] uppercase tracking-[0.16em] text-wine">
                    Continue
                  </button>
                </form>
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 bg-garden px-5 py-4 text-paper">
              <div>
                <p className="font-serif text-2xl">Studio Admin</p>
                <p className="text-sm text-paper/90">Schedule, releases, weddings</p>
              </div>
              <form action={demoSignIn}>
                <input type="hidden" name="staffId" value={IDS.staff} />
                <button type="submit" className="text-[0.68rem] uppercase tracking-[0.16em] text-butter">
                  Continue
                </button>
              </form>
            </li>
          </ul>
        </section>
      </article>
    </SiteFrame>
  );
}
