import type { AnchorHTMLAttributes } from "react";

type HardLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  href: string;
};

/**
 * Uses native document navigation instead of vinext's client router.
 *
 * The Railway deployment currently serves every route correctly, but the
 * vinext client-side Link shim throws during RSC navigation. A normal anchor
 * keeps links accessible and reliable while still preserving their existing
 * styles and semantics.
 */
export function HardLink({ href, ...props }: HardLinkProps) {
  return <a href={href} {...props} />;
}
