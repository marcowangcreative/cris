import Link from "next/link";
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
      <article className="mx-auto grid w-full max-w-6xl gap-16 px-6 py-10 md:grid-cols-2">
        <section>
          <Kicker>Client portal</Kicker>
          <h1 className="mt-4 font-serif text-5xl leading-tight">A private link, shown here.</h1>
          <p className="mt-4 leading-7 text-ink-soft">
            In a live studio this would email a magic link. Demo mode shows the
            link on this page instead. No message is sent.
          </p>
          <form action={requestMagicLink} className="mt-8 space-y-4">
            <label className="block text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
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
        <section>
          <Kicker>Demo profiles</Kicker>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {people.map(([id, name, note]) => (
              <li key={id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-serif text-2xl">{name}</p>
                  <p className="text-sm text-stone">{note}</p>
                </div>
                <form action={demoSignIn}>
                  <input type="hidden" name="clientId" value={id} />
                  <button type="submit" className="text-sm text-wine hover:underline">
                    Continue
                  </button>
                </form>
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-serif text-2xl">Studio Admin</p>
                <p className="text-sm text-stone">Schedule, releases, weddings</p>
              </div>
              <form action={demoSignIn}>
                <input type="hidden" name="staffId" value={IDS.staff} />
                <button type="submit" className="text-sm text-wine hover:underline">
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
