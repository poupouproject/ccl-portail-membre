"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { ReactNode } from "react";

interface SafeImageProps extends Omit<ImageProps, 'alt'> {
  alt: string;
  fallback?: ReactNode;
}

/**
 * Composant SafeImage qui gère les erreurs de chargement d'images
 * Si l'image échoue à charger, affiche un fallback au lieu de crasher
 */
export function SafeImage({
  src,
  alt,
  fallback,
  className = "",
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  // Si l'image a échoué ou si src est invalide, afficher le fallback
  if (hasError || !src) {
    return <>{fallback}</>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

/**
 * Composant pour les images optionnelles avec support Next.js Image
 * Utilise Next.js Image pour l'optimisation quand possible
 */
export function OptionalImage({
  src,
  alt,
  fallback,
  className = "",
  width,
  height,
  fill = false,
}: {
  src?: string | null;
  alt: string;
  fallback?: ReactNode;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <>{fallback}</>;
  }

  // Si fill est utilisé pour les images responsives
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        onError={() => setHasError(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    );
  }

  // Pour les images avec dimensions fixes
  return (
    <Image
      src={src}
      alt={alt}
      width={width || 200}
      height={height || 150}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
