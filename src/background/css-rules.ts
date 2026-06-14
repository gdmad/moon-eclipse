// === Moon Eclipse: CSS Rules Generator ===

import { MoonSettings, DEFAULTS } from "../shared/types";
import { lighten, darken } from "./color-utils";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Return value only if it is a safe 6-digit hex color, else the fallback. */
function safeColor(value: string, fallback: string): string {
  return HEX_COLOR.test(value) ? value : fallback;
}

/**
 * Generate a CSS string with dark-theme rules for common elements.
 * Result is cached externally; this function is pure.
 */
export function generateCSS(settings: MoonSettings): string {
  // Defense in depth: never interpolate an unvalidated value into the rules.
  const bg = safeColor(settings.backgroundColor, DEFAULTS.backgroundColor);
  const fg = safeColor(settings.textColor, DEFAULTS.textColor);

  // Derived colors
  const tableBg = lighten(bg, 4);
  const inputBg = darken(bg, 4);
  const inputBorder = lighten(bg, 12);
  const btnBg = darken(fg, 70);
  const btnColor = fg;
  const linkColor = lighten(fg, 15);
  const codeBg = darken(bg, 6);
  const codeColor = lighten(fg, 10);

  return [
    // --- Base ---
    `html,body{background-color:${bg}!important;color:${fg}!important;transition:background-color 0.15s,color 0.15s!important;}`,

    // --- Text blocks ---
    `p,li,td,th,caption,dt,dd,blockquote,article,section,aside,h1,h2,h3,h4,h5,h6,span,div{color:${fg}!important;background-color:transparent!important;}`,

    // --- Tables ---
    `table,thead,tbody,tfoot{background-color:${tableBg}!important;color:${fg}!important;}`,

    // --- Inputs ---
    `input:not([type="submit"]):not([type="button"]):not([type="reset"]),textarea,select{background-color:${inputBg}!important;color:${fg}!important;border:1px solid ${inputBorder}!important;}`,

    // --- Buttons ---
    `button,input[type="submit"],input[type="button"]{background-color:${btnBg}!important;color:${btnColor}!important;border:1px solid ${inputBorder}!important;}`,

    // --- Links ---
    `a,a:visited{color:${linkColor}!important;}`,

    // --- Code ---
    `code,pre,kbd,samp{background-color:${codeBg}!important;color:${codeColor}!important;border:1px solid ${inputBorder}!important;}`,

    // --- Media ---
    `img,video,svg,canvas{opacity:0.92!important;}`,

    // --- Scrollbars ---
    `::-webkit-scrollbar{background-color:${bg}!important;width:12px!important;}`,
    `::-webkit-scrollbar-thumb{background-color:${lighten(bg, 10)}!important;border-radius:6px!important;}`,
    `::-webkit-scrollbar-track{background-color:${bg}!important;}`,

    // --- Selection ---
    `::selection{background-color:${lighten(bg, 20)}!important;color:${fg}!important;}`,
  ].join("");
}
