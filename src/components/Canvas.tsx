"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface CanvasProps {
  pixels: Map<string, string>;
  selectedColor: string;
  selectedPixels: Map<string, string>;
  onPixelClick: (x: number, y: number) => void;
  canvasWidth: number;
  canvasHeight: number;
}

const PIXEL_SIZE = 10;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 40;
const INITIAL_ZOOM = 0.5;

export default function Canvas({
  pixels,
  selectedColor,
  selectedPixels,
  onPixelClick,
  canvasWidth,
  canvasHeight,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);

  // Touch state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);

  // Calculate what the centered offset would be for a given zoom level
  const getCenteredOffset = useCallback((zoomLevel: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const totalWidth = canvasWidth * PIXEL_SIZE * zoomLevel;
    const totalHeight = canvasHeight * PIXEL_SIZE * zoomLevel;
    const centerX = (canvas.width - totalWidth) / 2;
    const centerY = (canvas.height - totalHeight) / 2;
    return { x: centerX, y: centerY };
  }, [canvasWidth, canvasHeight]);

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !offset) return;

    // Clear canvas with dark background (UWaterloo black)
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pixelRenderSize = PIXEL_SIZE * zoom;

    // Calculate visible area
    const visibleStartX = Math.max(0, Math.floor(-offset.x / pixelRenderSize));
    const visibleStartY = Math.max(0, Math.floor(-offset.y / pixelRenderSize));
    const visibleEndX = Math.min(
      canvasWidth,
      Math.ceil((canvas.width - offset.x) / pixelRenderSize)
    );
    const visibleEndY = Math.min(
      canvasHeight,
      Math.ceil((canvas.height - offset.y) / pixelRenderSize)
    );

    // Draw grid background (white pixels) - solid, no gaps
    ctx.fillStyle = "#FFFFFF";
    const gridX = visibleStartX * pixelRenderSize + offset.x;
    const gridY = visibleStartY * pixelRenderSize + offset.y;
    const gridW = (visibleEndX - visibleStartX) * pixelRenderSize;
    const gridH = (visibleEndY - visibleStartY) * pixelRenderSize;
    ctx.fillRect(gridX, gridY, gridW, gridH);

    // Draw placed pixels
    pixels.forEach((color, key) => {
      const [x, y] = key.split(",").map(Number);
      if (x >= visibleStartX && x < visibleEndX && y >= visibleStartY && y < visibleEndY) {
        const screenX = x * pixelRenderSize + offset.x;
        const screenY = y * pixelRenderSize + offset.y;
        ctx.fillStyle = color;
        ctx.fillRect(screenX, screenY, pixelRenderSize, pixelRenderSize);
      }
    });

    // Draw selected pixels (pending placement)
    selectedPixels.forEach((color, key) => {
      const [x, y] = key.split(",").map(Number);
      if (x >= visibleStartX && x < visibleEndX && y >= visibleStartY && y < visibleEndY) {
        const screenX = x * pixelRenderSize + offset.x;
        const screenY = y * pixelRenderSize + offset.y;

        // Draw the pixel color
        ctx.fillStyle = color;
        ctx.fillRect(screenX, screenY, pixelRenderSize, pixelRenderSize);

        // Draw selection border (UWaterloo gold)
        ctx.strokeStyle = "#ffd54f";
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX + 1, screenY + 1, pixelRenderSize - 2, pixelRenderSize - 2);
      }
    });

    // Draw hover highlight
    if (hoveredPixel) {
      const screenX = hoveredPixel.x * pixelRenderSize + offset.x;
      const screenY = hoveredPixel.y * pixelRenderSize + offset.y;

      // Check if this pixel is already selected
      const isSelected = selectedPixels.has(`${hoveredPixel.x},${hoveredPixel.y}`);

      // Draw semi-transparent preview of the color
      if (!isSelected) {
        ctx.fillStyle = selectedColor + "80"; // 50% opacity
        ctx.fillRect(screenX, screenY, pixelRenderSize, pixelRenderSize);
      }

      // Draw border
      ctx.strokeStyle = isSelected ? "#ef4444" : "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, pixelRenderSize, pixelRenderSize);
    }
  }, [pixels, selectedPixels, zoom, offset, canvasWidth, canvasHeight, hoveredPixel, selectedColor]);

  // Initialize canvas size and center it
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Center on first load
      if (!offset) {
        setOffset(getCenteredOffset(INITIAL_ZOOM));
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [offset, getCenteredOffset]);

  // Redraw when dependencies change
  useEffect(() => {
    draw();
  }, [draw]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !offset) return null;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((screenX - rect.left - offset.x) / (PIXEL_SIZE * zoom));
    const y = Math.floor((screenY - rect.top - offset.y) / (PIXEL_SIZE * zoom));

    if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
      return { x, y };
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setMouseDownPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle dragging
    if (isDragging && dragStart && offset) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    // Update hovered pixel
    const coords = screenToCanvas(e.clientX, e.clientY);
    setHoveredPixel(coords);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Only register click if we didn't drag much
    if (mouseDownPos) {
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);

      // If mouse barely moved, treat as click
      if (dx < 5 && dy < 5) {
        const coords = screenToCanvas(e.clientX, e.clientY);
        if (coords) {
          onPixelClick(coords.x, coords.y);
        }
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setMouseDownPos(null);
  };

  const handleMouseLeave = () => {
    setHoveredPixel(null);
    setIsDragging(false);
    setDragStart(null);
    setMouseDownPos(null);
  };

  // Touch handlers for mobile
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - prepare for pan or tap
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      // Two fingers - prepare for pinch zoom
      setLastPinchDistance(getTouchDistance(e.touches));
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent page scroll

    if (e.touches.length === 1 && isDragging && dragStart && offset) {
      // Single finger pan
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setDragStart({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2 && lastPinchDistance !== null && offset) {
      // Pinch zoom
      const canvas = canvasRef.current;
      if (!canvas) return;

      const newDistance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const rect = canvas.getBoundingClientRect();
      const centerX = center.x - rect.left;
      const centerY = center.y - rect.top;

      const scale = newDistance / lastPinchDistance;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * scale));
      const zoomRatio = newZoom / zoom;

      setOffset({
        x: centerX - (centerX - offset.x) * zoomRatio,
        y: centerY - (centerY - offset.y) * zoomRatio,
      });
      setZoom(newZoom);
      setLastPinchDistance(newDistance);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Check if it was a tap (no significant movement)
    if (touchStart && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - touchStart.x);
      const dy = Math.abs(touch.clientY - touchStart.y);

      if (dx < 10 && dy < 10) {
        // It's a tap - place pixel
        const coords = screenToCanvas(touch.clientX, touch.clientY);
        if (coords) {
          onPixelClick(coords.x, coords.y);
        }
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setTouchStart(null);
    setLastPinchDistance(null);
  };

  // Zoom with mouse wheel - zoom toward mouse position
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas || !offset) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));
    const zoomRatio = newZoom / zoom;

    // Zoom toward mouse position
    setOffset({
      x: mouseX - (mouseX - offset.x) * zoomRatio,
      y: mouseY - (mouseY - offset.y) * zoomRatio,
    });
    setZoom(newZoom);
  }, [zoom, offset]);

  // Attach wheel event with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleZoomIn = () => {
    const canvas = canvasRef.current;
    if (!canvas || !offset) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const newZoom = Math.min(MAX_ZOOM, zoom * 1.5);
    const zoomRatio = newZoom / zoom;

    setOffset({
      x: centerX - (centerX - offset.x) * zoomRatio,
      y: centerY - (centerY - offset.y) * zoomRatio,
    });
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current;
    if (!canvas || !offset) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const newZoom = Math.max(MIN_ZOOM, zoom / 1.5);
    const zoomRatio = newZoom / zoom;

    setOffset({
      x: centerX - (centerX - offset.x) * zoomRatio,
      y: centerY - (centerY - offset.y) * zoomRatio,
    });
    setZoom(newZoom);
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className={`w-full h-full canvas-container ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Coordinates display */}
      <div className="absolute bottom-4 left-4 panel px-2.5 py-1.5 text-xs font-mono">
        {hoveredPixel ? (
          <span className="text-[var(--text-primary)]">({hoveredPixel.x}, {hoveredPixel.y})</span>
        ) : (
          <span className="text-[var(--text-secondary)]">-</span>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1">
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 panel flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <div className="panel px-2.5 py-1.5 text-xs font-mono text-[var(--text-secondary)] min-w-[52px] text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 panel flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
