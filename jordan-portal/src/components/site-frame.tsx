import { PublicHeader, SiteFooter } from "./shell";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main id="content">{children}</main>
      <SiteFooter />
    </>
  );
}
