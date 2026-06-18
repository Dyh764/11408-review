"use client";

import { toPng } from "html-to-image";

export async function generateShareCardImage(cardElement: HTMLElement) {
  return toPng(cardElement, {
    width: 1080,
    height: 1350,
    canvasWidth: 1080,
    canvasHeight: 1350,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: "#f4f0ff",
    style: {
      width: "1080px",
      height: "1350px",
      overflow: "hidden",
    },
  });
}
