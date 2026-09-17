import type { CaptionStyle } from "./schema";
import { DEFAULT_STYLE, FALLBACK_GRADIENT } from "./schema";

export type Look = {
  id: string;
  name: string;
  caption: string;
  highlight: string;
  background: string;
  style: CaptionStyle;
};

export const BARS_LOOK: Look = {
  id: "bars",
  name: "Black / red bars",
  caption: "STRUGGLE WITH\nANXIETY\nDEPRESSION",
  highlight: "DEPRESSION",
  background: "linear-gradient(180deg, #1a1a1a 0%, #111111 100%)",
  style: {
    ...DEFAULT_STYLE,
    "font-family": "Anton",
    "font-size": 64,
    "line-color": "#FFFFFF",
    "word-color": "#FFFFFF",
    "outline-color": "#000000",
    "outline-width": 0,
    "shadow-offset": 0,
    "max-words-per-line": 3,
    y: 1280,
  },
};

export const PILLS_LOOK: Look = {
  id: "pills",
  name: "Blue pills",
  caption: "VICTIMS\nARE\nFINALLY",
  highlight: "ARE",
  background: "linear-gradient(180deg, #0b1220 0%, #152238 100%)",
  style: {
    ...DEFAULT_STYLE,
    "font-family": "Montserrat",
    "font-size": 62,
    "line-color": "#FFFFFF",
    "word-color": "#FFE566",
    "outline-color": "#000000",
    "outline-width": 0,
    "shadow-offset": 0,
    "max-words-per-line": 2,
    y: 1320,
  },
};

export const OUTLINE_LOOK: Look = {
  id: "outline",
  name: "Yellow outline",
  caption: "I DIDN'T COME\nJUST TO SELL",
  highlight: "SELL",
  background: FALLBACK_GRADIENT,
  style: DEFAULT_STYLE,
};

export const STARTER_LOOKS: Look[] = [BARS_LOOK, PILLS_LOOK, OUTLINE_LOOK];
