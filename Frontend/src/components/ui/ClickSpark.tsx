import React, { useRef, useEffect, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | [number, number, number, number];
  extraScale?: number;
  children: React.ReactNode;
}

const ClickSpark = ({
  sparkColor = "#fff",
  sparkSize = 5,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = "easeOut",
  extraScale = 1.0,
  children,
}: ClickSparkProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useAnimation();
  const sparksRef = useRef<{ x: number; y: number; angle: number; velocity: number; size: number; alpha: number; life: number }[]>([]);
  const animationFrameRef = useRef<number>(0);
  const drawSparksRef = useRef<((ctx: CanvasRenderingContext2D, width: number, height: number) => void) | null>(null);
  const lastClickTime = useRef(0);

  const drawSparks = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    
    let hasActiveSparks = false;

    sparksRef.current.forEach((spark) => {
        if (spark.life <= 0) return;
        hasActiveSparks = true;
        
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * spark.alpha * extraScale, 0, Math.PI * 2);
        ctx.fillStyle = sparkColor;
        ctx.globalAlpha = spark.alpha;
        ctx.fill();

        // Update particle
        spark.x += Math.cos(spark.angle) * spark.velocity;
        spark.y += Math.sin(spark.angle) * spark.velocity;
        spark.alpha -= 1 / (duration / 16); // Rough estimate of 60fps
        spark.life -= 16;
    });

    if (hasActiveSparks) {
        animationFrameRef.current = requestAnimationFrame(() => drawSparksRef.current?.(ctx, width, height));
    } else {
        ctx.clearRect(0, 0, width, height); // Clear on end
    }
  }, [sparkColor, duration, extraScale]);

  useEffect(() => {
    drawSparksRef.current = drawSparks;
  }, [drawSparks]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = performance.now();
    // Debounce to prevent crazy spamming
    if (now - lastClickTime.current < 100) return;
    lastClickTime.current = now;

    if (!containerRef.current || !canvasRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Initialize particles
    sparksRef.current = Array.from({ length: sparkCount }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() * 0.5 - 0.25);
      return {
        x,
        y,
        angle,
        velocity: (sparkRadius / (duration / 16)) * (0.8 + Math.random() * 0.4),
        size: sparkSize * (0.8 + Math.random() * 0.4),
        alpha: 1,
        life: duration
      };
    });

    // Start animation loop
    cancelAnimationFrame(animationFrameRef.current);
    drawSparks(ctx, canvasRef.current.width, canvasRef.current.height);

    // Optional subtle scale effect on the container
    controls.start({
        scale: [1, 0.98, 1],
        transition: { duration: 0.3, ease: easing }
    });
  };

  useEffect(() => {
    const resizeCanvas = () => {
        if (!containerRef.current || !canvasRef.current) return;
        canvasRef.current.width = containerRef.current.offsetWidth;
        canvasRef.current.height = containerRef.current.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    return () => {
        window.removeEventListener("resize", resizeCanvas);
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      onClick={handleClick}
      animate={controls}
      className="relative block w-full h-full"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-50 h-full w-full"
      />
      {children}
    </motion.div>
  );
};

export default ClickSpark;
