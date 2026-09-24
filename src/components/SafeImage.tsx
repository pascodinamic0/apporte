"use client";
import Image, { ImageProps } from "next/image";
import { useState } from "react";

type Props = Omit<ImageProps, "onError" | "src"> & {
  src: string | null | undefined;
  fallbackSrc?: string;
};

export function SafeImage({ src, fallbackSrc = "/icons/apporte.svg", alt, ...rest }: Props) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fallbackSrc} alt="" {...(rest as any)} />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...rest}
    />
  );
}

