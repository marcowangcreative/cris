import Link from "next/link";
import { Kicker } from "@/components/ui";
import { exceptionQueue } from "@/lib/domain/queries";
import { readDemoDb } from "@/lib/demo/store";

export const metadata = { title: "Exceptions" };

export default function ExceptionsPage() {
  const items = exceptionQueue(readDemoDb());
  return (
    <div>
      <Kicker>Exceptions</Kicker>
      <h1 className="mt-2 font-serif text-5xl">Needs a person</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Failed payments, unmatched cancellations, and duplicate deposits land here.
        A failed or missing payment is never a confirmed booking.
      </p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <li key={item.id} className="py-4">
            <p className="font-serif text-2xl">{item.title}</p>
            <p className="mt-1 text-sm text-ink-soft">{item.detail}</p>
            {item.href ? (
              <Link href={item.href} className="mt-2 inline-block text-sm text-wine">
                Open the project
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
