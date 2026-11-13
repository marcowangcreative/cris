// Placeholder photography for the mockup. Swap these files for real photos of
// Jordan and her clients. They are not photographs of Jordan. Credits: IMAGE_CREDITS.md.

const photos = {
  hero: {
    alt: "Brunette hair lifted against a plain wall, gray sweater, soft light",
    src: "/images/hero",
  },
  blonding: {
    alt: "Back view of long balayage hair, dark roots into blonde waves",
    src: "/images/blonding",
  },
  bridal: {
    alt: "Bridal updo with a pearl hair vine, photographed from behind",
    src: "/images/bridal",
  },
  gown: {
    alt: "Bridal hair falling down the back of a pale gown, pearl vine in the twist",
    src: "/images/gown",
  },
  salon: {
    alt: "Stylist blow-drying a client in a bright salon with black chairs",
    src: "/images/salon",
  },
  before: {
    alt: "Close-up of brunette waves",
    src: "/images/before",
  },
  after: {
    alt: "Close-up of glossy straight hair, warm light",
    src: "/images/after",
  },
} as const;

export type PhotoName = keyof typeof photos;

export function Photo({
  name,
  className = "aspect-[4/5]",
  sizes = "(min-width: 768px) 50vw, 100vw",
}: {
  name: PhotoName;
  className?: string;
  sizes?: string;
}) {
  const photo = photos[name];
  return (
    <figure className={`relative overflow-hidden bg-[#f2f2f2] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${photo.src}-1600.webp`}
        srcSet={`${photo.src}-800.webp 800w, ${photo.src}-1600.webp 1600w`}
        sizes={sizes}
        alt={photo.alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </figure>
  );
}
