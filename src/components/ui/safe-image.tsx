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
 * Composant pour les images qui peuvent ne pas exister (avec <img> fallback)
 * Plus robuste que SafeImage pour les URLs externes
 */
export function OptionalImage({
  src,
  alt,
  fallback,
  className = "",
}: {
  src?: string | null;
  alt: string;
  fallback?: ReactNode;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
