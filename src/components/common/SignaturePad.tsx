import { Eraser, PenLine } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface SignaturePadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  height?: number;
}

/**
 * Zone de signature manuscrite tactile (doigt / stylet / souris) pour sécuriser
 * la remise d'un colis lorsque le client n'a pas son téléphone (batterie vide).
 * Toujours rendue sur fond papier blanc net pour une lisibilité parfaite dans le dossier preuves.
 */
export const SignaturePad: React.FC<SignaturePadProps> = ({ value, onChange, height = 124 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(Boolean(value));
  const [hasStroke, setHasStroke] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, height);
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [height]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      setHasStroke(true);
    }
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasStrokeRef.current) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, height);
    hasStrokeRef.current = false;
    setHasStroke(false);
    onChange('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium flex items-center gap-1" style={{ color: 'var(--ink-secondary)' }}>
          <PenLine className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          Signature manuscrite du réceptionnaire *
        </span>
        {hasStroke && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
            style={{ color: 'var(--ink-muted)' }}
          >
            <Eraser className="w-3 h-3" />
            Effacer
          </button>
        )}
      </div>

      <div
        className="relative rounded-xl border overflow-hidden select-none"
        style={{ borderColor: hasStroke ? 'var(--ok-border)' : 'var(--border-strong)', backgroundColor: '#FFFFFF' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ height: `${height}px`, touchAction: 'none' }}
          className="w-full block cursor-crosshair"
        />
        {!hasStroke && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[12px] text-[#A1A1AA]">Faites signer le réceptionnaire ici avec le doigt</span>
          </div>
        )}
      </div>
    </div>
  );
};
