import Image from "next/image";

/**
 * Mrs. Cookie mascot — used as the avatar/icon for the admin AI assistant.
 * Wraps next/image with sensible defaults so it can be dropped wherever a
 * fixed-size avatar is needed.
 *
 * Sizes are in pixels for the actual <img>; the wrapping span gives the
 * outer hit area / background colour.
 */
type MrsCookieAvatarProps = {
  size?: number;
  className?: string;
  /** Optional accessible label. Defaults to "Mrs. Cookie". */
  label?: string;
  /** When true, omits the soft pink background ring. */
  bare?: boolean;
};

export function MrsCookieAvatar({
  size = 40,
  className = "",
  label = "Mrs. Cookie",
  bare = false,
}: MrsCookieAvatarProps) {
  const wrapperBase = bare
    ? ""
    : "rounded-full bg-gradient-to-br from-cb-peach/70 to-cb-cream-2 ring-1 ring-inset ring-cb-border-strong";
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden ${wrapperBase} ${className}`}
      style={{ width: size, height: size }}
      aria-label={label}
    >
      <Image
        src="/brand/mrs-cookie.png"
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
        priority={false}
      />
    </span>
  );
}
