import Image from "next/image";

/**
 * A photograph in a fixed frame, or a designed monogram plate when the file is
 * missing. Shared by the leadership section and the President's profile page
 * (CR-0010), which previously carried near-identical copies.
 *
 * The fallback is deliberate rather than a broken `<img>`: client photography
 * arrives late and gets replaced, and a missing file should degrade to something
 * that still holds the layout. It renders the initials for sighted users and the
 * real alt text for screen readers.
 *
 * `field` and `monogram` are passed in as classes so the caller's brand decides
 * the plate's colour (ink+green on the umbrella, navy+gold on Think-Winners).
 */
export function Portrait({
  src,
  present,
  alt,
  initials,
  className,
  sizes,
  field,
  monogram,
  preload = false,
}: {
  src: string;
  /** Whether the file exists on disk. Resolved by the caller at build time. */
  present: boolean;
  alt: string;
  initials: string;
  /** Frame geometry: aspect ratio, radius, width. */
  className: string;
  sizes: string;
  field: string;
  monogram: string;
  /** Only for a genuine above-the-fold hero image. */
  preload?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden [container-type:inline-size] ${className}`}>
      {present ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={preload}
          className="object-cover object-top"
        />
      ) : (
        <div className={`absolute inset-0 grid place-items-center ${field}`}>
          <span
            aria-hidden="true"
            className={`font-display text-[clamp(1.25rem,7cqi,4rem)] font-semibold ${monogram}`}
          >
            {initials}
          </span>
          <span className="sr-only">{alt}</span>
        </div>
      )}
    </div>
  );
}
