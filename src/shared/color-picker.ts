// === Moon Eclipse: Custom in-popup Color Picker ===
// A dependency-free HSV picker (saturation/value square + hue slider) built
// on CSS gradients and pointer events. It avoids the native <input type=color>
// dialog, which closes the browser_action popup when it steals focus.

import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from "../background/color-utils";

export interface ColorPicker {
  el: HTMLElement;
  setHex(hex: string): void;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export function createColorPicker(
  initialHex: string,
  onChange: (hex: string) => void,
): ColorPicker {
  const start = hexToRgb(initialHex);
  let { h, s, v } = rgbToHsv(start.r, start.g, start.b);

  const el = document.createElement("div");
  el.className = "cp";
  const sv = document.createElement("div");
  sv.className = "cp-sv";
  const svCur = document.createElement("div");
  svCur.className = "cp-sv-cur";
  sv.appendChild(svCur);
  const hue = document.createElement("div");
  hue.className = "cp-hue";
  const hueCur = document.createElement("div");
  hueCur.className = "cp-hue-cur";
  hue.appendChild(hueCur);
  el.appendChild(sv);
  el.appendChild(hue);

  const toHex = (): string => {
    const c = hsvToRgb(h, s, v);
    return rgbToHex(c.r, c.g, c.b);
  };

  function paint(): void {
    const pure = hsvToRgb(h, 1, 1);
    const hueHex = rgbToHex(pure.r, pure.g, pure.b);
    sv.style.background =
      `linear-gradient(to top,#000,rgba(0,0,0,0)),` +
      `linear-gradient(to right,#fff,${hueHex})`;
    svCur.style.left = `${s * 100}%`;
    svCur.style.top = `${(1 - v) * 100}%`;
    svCur.style.backgroundColor = toHex();
    hueCur.style.left = `${(h / 360) * 100}%`;
  }

  // Drag handling shared by both controls.
  function track(
    target: HTMLElement,
    handle: (e: PointerEvent, rect: DOMRect) => void,
  ): void {
    const run = (e: PointerEvent) => handle(e, target.getBoundingClientRect());
    target.addEventListener("pointerdown", (e) => {
      target.setPointerCapture(e.pointerId);
      run(e);
      const move = (ev: PointerEvent) => run(ev);
      const up = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", up);
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", up);
    });
  }

  track(sv, (e, r) => {
    s = clamp01((e.clientX - r.left) / r.width);
    v = 1 - clamp01((e.clientY - r.top) / r.height);
    paint();
    onChange(toHex());
  });

  track(hue, (e, r) => {
    h = clamp01((e.clientX - r.left) / r.width) * 360;
    paint();
    onChange(toHex());
  });

  paint();

  return {
    el,
    setHex(hex: string): void {
      const rgb = hexToRgb(hex);
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      h = hsv.h;
      s = hsv.s;
      v = hsv.v;
      paint();
    },
  };
}
