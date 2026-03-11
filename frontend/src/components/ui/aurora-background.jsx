import { useEffect, useRef } from 'react';

/**
 * Aurora background — soft animated northern-lights effect.
 * Renders an absolutely-positioned canvas that fills its parent.
 * Keep the parent `position: relative` and `overflow: hidden`.
 */
export function AuroraBackground({ style, className }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Orbs definition — ocean-teal-indigo palette fits the portal theme
    const orbs = [
      { x: 0.15, y: 0.25, rx: 0.55, ry: 0.40, speed: 0.00018, phase: 0.0,  color: [0, 180, 220] },
      { x: 0.75, y: 0.15, rx: 0.50, ry: 0.35, speed: 0.00013, phase: 1.2,  color: [30, 80, 200] },
      { x: 0.50, y: 0.70, rx: 0.60, ry: 0.38, speed: 0.00022, phase: 2.5,  color: [0, 140, 180] },
      { x: 0.85, y: 0.60, rx: 0.45, ry: 0.32, speed: 0.00016, phase: 0.8,  color: [60, 40, 200] },
      { x: 0.30, y: 0.80, rx: 0.48, ry: 0.36, speed: 0.00020, phase: 3.8,  color: [0, 200, 180] },
    ];

    let w = 0, h = 0;

    function resize() {
      w = canvas.width  = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function draw(ts) {
      if (!w || !h) { rafRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, w, h);

      for (const orb of orbs) {
        const t   = ts * orb.speed + orb.phase;
        const cx  = (orb.x + 0.12 * Math.sin(t * 1.3)) * w;
        const cy  = (orb.y + 0.10 * Math.cos(t * 0.9)) * h;
        const rx  = orb.rx * w;
        const ry  = orb.ry * h;

        // Save + transform so we can draw an ellipse as a circle gradient
        ctx.save();
        ctx.scale(1, ry / rx);
        const grad = ctx.createRadialGradient(cx, cy * (rx / ry), 0, cx, cy * (rx / ry), rx);
        const [r, g, b] = orb.color;
        grad.addColorStop(0,   `rgba(${r},${g},${b},0.38)`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.14)`);
        grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h * (rx / ry));
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
