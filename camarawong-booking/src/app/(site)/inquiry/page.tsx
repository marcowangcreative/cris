import { InquiryForm } from "@/components/inquiry-form";
import { studio } from "@/lib/config";

export const metadata = { title: "Inquire" };

export default async function InquiryPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const query = await searchParams;
  return (
    <main className="narrow">
      <p className="eyebrow">Talk first</p>
      <h1>Write the studio.</h1>
      <p className="lede">
        Use this when the date, the room, or the collection still needs a conversation. It does not hold a time. If you already know, book it.
      </p>
      <InquiryForm
        packages={studio.packages.map((item) => ({ id: item.id, name: item.name }))}
        initialPackage={query.package ?? "digital"}
      />
    </main>
  );
}
