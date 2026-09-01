import { useRef, useCallback } from "react";

/**
 * Returns pointer handlers + a ref of extra manual rotation (radians).
 * Attach the handlers to a selected object's group; add the returned
 * offset to that object's auto-rotation inside useFrame so dragging
 * temporarily overrides (rather than fights) the idle spin.
 */
export default function useDragRotate({ active = true } = {}) {
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (event) => {
      if (!active) return;
      event.stopPropagation();
      dragging.current = true;
      last.current = { x: event.clientX, y: event.clientY };
      event.target?.setPointerCapture?.(event.pointerId);
    },
    [active]
  );

  const onPointerMove = useCallback((event) => {
    if (!dragging.current) return;
    event.stopPropagation();
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    last.current = { x: event.clientX, y: event.clientY };
    velocity.current = { x: dx * 0.006, y: dy * 0.006 };
    offset.current.y += velocity.current.x;
    offset.current.x += velocity.current.y;
  }, []);

  const onPointerUp = useCallback((event) => {
    dragging.current = false;
    event?.target?.releasePointerCapture?.(event.pointerId);
  }, []);

  // Call each frame from the owning component to apply inertia decay
  // once the user releases the drag.
  const settle = () => {
    if (!dragging.current) {
      velocity.current.x *= 0.94;
      velocity.current.y *= 0.94;
      offset.current.y += velocity.current.x;
      offset.current.x += velocity.current.y;
    }
    return offset.current;
  };

  return { onPointerDown, onPointerMove, onPointerUp, settle, isDragging: dragging };
}
