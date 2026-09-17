import type { CaptionStyle } from "./schema";

const KEY = "caption-cloner-styles";

export type SavedStyle = {
  name: string;
  style: CaptionStyle;
  background: string;
  caption?: string;
  highlight?: string;
};

export function loadSavedStyles(): SavedStyle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedStyles(styles: SavedStyle[]) {
  localStorage.setItem(KEY, JSON.stringify(styles));
}
