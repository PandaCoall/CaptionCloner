import { normalizeStyle, type CaptionStyle } from "./schema";

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
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => {
      const item = entry as SavedStyle;
      return {
        ...item,
        style: normalizeStyle(item.style),
      };
    });
  } catch {
    return [];
  }
}

export function persistSavedStyles(styles: SavedStyle[]) {
  localStorage.setItem(KEY, JSON.stringify(styles));
}
