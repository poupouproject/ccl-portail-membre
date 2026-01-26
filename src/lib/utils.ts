import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine les classes Tailwind de manière intelligente
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate une date en français
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
}

/**
 * Formate une heure en français
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Génère les initiales d'un nom
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Vérifie si un événement est dans le passé
 */
export function isPastEvent(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d < new Date();
}

/**
 * Retourne la couleur du badge selon le rôle staff
 */
export function getStaffRoleBadgeColor(role: string): string {
  switch (role) {
    case "head_coach":
      return "bg-club-orange text-white";
    case "assistant":
      return "bg-slate-500 text-white";
    case "sweeper":
      return "bg-slate-400 text-white";
    default:
      return "bg-slate-300 text-slate-700";
  }
}

/**
 * Retourne le libellé du rôle staff
 */
export function getStaffRoleLabel(role: string): string {
  switch (role) {
    case "head_coach":
      return "Lead";
    case "assistant":
      return "Assistant";
    case "sweeper":
      return "Serre-file";
    default:
      return role;
  }
}
