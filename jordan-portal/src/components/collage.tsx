export function Photo({
  label,
  className = "aspect-[4/5]",
}: {
  label: string;
  className?: string;
}) {
  return (
    <figure className={`relative bg-[#f2f2f2] ${className}`}>
      <figcaption className="absolute bottom-4 left-4 text-[12px] uppercase tracking-[0.05em] text-[#6a6a6a]">
        {label}
      </figcaption>
    </figure>
  );
}

export function Portrait({
  label = "Jordan portrait",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return <Photo label={label} className={`aspect-[4/5] w-full ${className}`} />;
}
