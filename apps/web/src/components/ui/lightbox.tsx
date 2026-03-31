'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

interface LightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex = 0, open, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIndex(initialIndex);
    setZoomed(false);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [initialIndex, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { setIndex((i) => (i > 0 ? i - 1 : images.length - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setIndex((i) => (i < images.length - 1 ? i + 1 : 0)); e.preventDefault(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, images.length, onClose]);

  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : images.length - 1)), [images.length]);
  const next = useCallback(() => setIndex((i) => (i < images.length - 1 ? i + 1 : 0)), [images.length]);

  const handleDoubleClick = useCallback(() => {
    if (zoomed) { setZoomed(false); setScale(1); setOffset({ x: 0, y: 0 }); }
    else { setZoomed(true); setScale(2.5); }
  }, [zoomed]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Pinch-to-zoom
  const touchRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) touchRef.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchRef.current !== null) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        setScale(Math.min(5, Math.max(1, dist / touchRef.current * 1.5)));
      }
    };
    const onTouchEnd = () => { touchRef.current = null; };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd); };
  }, [open]);

  if (!open || images.length === 0) return null;

  return (
    <div
      className="lightbox-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: zoomed ? 'zoom-out' : 'zoom-in',
      }}
    >
      {/* Close button */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16, zIndex: 10,
        background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
        width: 40, height: 40, color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: 1,
      }}>×</button>

      {/* Prev arrow */}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{
          position: 'absolute', left: 16, zIndex: 10,
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          width: 48, height: 48, color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1,
        }}>‹</button>
      )}

      {/* Image */}
      <img
        src={images[index]}
        alt={`Preview ${index + 1}`}
        onClick={(e) => { e.stopPropagation(); handleDoubleClick(); }}
        onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(); }}
        draggable={false}
        style={{
          maxWidth: zoomed ? 'none' : '90vw',
          maxHeight: zoomed ? 'none' : '90vh',
          objectFit: 'contain',
          transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
          transition: scale < 2 ? 'transform 0.2s ease' : 'none',
          userSelect: 'none',
        }}
      />

      {/* Next arrow */}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); next(); }} style={{
          position: 'absolute', right: 16, zIndex: 10,
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          width: 48, height: 48, color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1,
        }}>›</button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.7)', fontSize: 14,
        }}>
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}


