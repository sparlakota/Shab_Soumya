"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Undo2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DrawingCanvasHandle {
  exportPng: () => Promise<Blob | null>;
  isEmpty: () => boolean;
}

const COLORS = ["#242321", "#8F4A55", "#B89A83", "#5F7A5C", "#3B5A8A", "#B08830"];

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, { disabled?: boolean }>(function DrawingCanvas(
  { disabled },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokes = useRef<{ x: number; y: number }[][]>([]);
  const currentStroke = useRef<{ x: number; y: number }[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx?.scale(dpr, dpr);
    fillBackground();
  }, []);

  function fillBackground() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FBF9F5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    drawing.current = true;
    currentStroke.current = [getPoint(e)];
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const point = getPoint(e);
    const prev = currentStroke.current[currentStroke.current.length - 1];
    currentStroke.current.push(point);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasContent(true);
  }

  function handlePointerUp() {
    if (currentStroke.current.length > 1) strokes.current.push(currentStroke.current);
    drawing.current = false;
    currentStroke.current = [];
  }

  function undo() {
    strokes.current.pop();
    redraw();
  }

  function clear() {
    strokes.current = [];
    redraw();
  }

  function redraw() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fillBackground();
    for (const stroke of strokes.current) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      stroke.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
    setHasContent(strokes.current.length > 0);
    void dpr;
  }

  useImperativeHandle(ref, () => ({
    exportPng: () =>
      new Promise((resolve) => {
        canvasRef.current?.toBlob((blob) => resolve(blob), "image/png");
      }),
    isEmpty: () => !hasContent,
  }));

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="h-72 w-full touch-none rounded-2xl border border-border bg-[#FBF9F5] sm:h-96"
      />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-foreground" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={undo} disabled={disabled}>
            <Undo2 className="h-4 w-4" /> Undo
          </Button>
          <Button variant="ghost" size="sm" onClick={clear} disabled={disabled}>
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        </div>
      </div>
    </div>
  );
});
