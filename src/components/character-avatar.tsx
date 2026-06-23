import Image from "next/image";

type CharacterAvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  variant?: "portrait" | "square";
};

export function CharacterAvatar({
  name,
  src,
  size = 40,
  className = "",
  variant = "portrait",
}: CharacterAvatarProps) {
  const radius = variant === "portrait" ? "rounded-full" : "rounded-md";

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`${radius} object-cover bg-zinc-100 ring-1 ring-zinc-200 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${radius} bg-zinc-200 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {name.charAt(0)}
    </div>
  );
}
