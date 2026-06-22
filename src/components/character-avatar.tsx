import Image from "next/image";

type CharacterAvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
};

export function CharacterAvatar({ name, src, size = 40, className = "" }: CharacterAvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-md object-cover bg-zinc-100 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md bg-zinc-200 text-xs font-semibold text-zinc-600 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {name.charAt(0)}
    </div>
  );
}
