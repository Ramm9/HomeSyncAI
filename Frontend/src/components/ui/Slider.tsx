import React from 'react';
import { motion } from 'framer-motion';
import { cn } from './Button';

interface SliderProps {
    min: number;
    max: number;
    step?: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    formatValue?: (val: number) => string;
    className?: string;
}

export const Slider = ({ min, max, step = 1, value, onChange, formatValue, className }: SliderProps) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState<'min' | 'max' | null>(null);

    const getPercentage = (val: number) => {
        return ((val - min) / (max - min)) * 100;
    };

    const handleMove = React.useCallback((clientX: number) => {
        if (!containerRef.current || !isDragging) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = x / rect.width;

        let newValue = min + percentage * (max - min);
        newValue = Math.round(newValue / step) * step;
        newValue = Math.max(min, Math.min(max, newValue));

        if (isDragging === 'min') {
            onChange([Math.min(newValue, value[1] - step), value[1]]);
        } else {
            onChange([value[0], Math.max(newValue, value[0] + step)]);
        }
    }, [min, max, step, value, onChange, isDragging]);

    const handlePointerMove = React.useCallback((e: React.PointerEvent | PointerEvent) => {
        if (isDragging) {
            handleMove((e as PointerEvent).clientX);
            // Simulating subtle haptic feedback for steps (works in browsers that support it when not standard API, fake it visually)
            if (typeof window !== 'undefined' && 'vibrate' in window.navigator) {
                // window.navigator.vibrate(2); // very subtle tick (optional)
            }
        }
    }, [isDragging, handleMove]);

    const handlePointerUp = React.useCallback(() => {
        setIsDragging(null);
    }, []);

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        } else {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, handlePointerMove, handlePointerUp]);

    const minPos = getPercentage(value[0]);
    const maxPos = getPercentage(value[1]);

    return (
        <div className={cn("w-full py-6 relative select-none", className)}>
            <div
                ref={containerRef}
                className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full relative cursor-pointer"
                onClick={(e) => {
                    // Simple click to nearest handle
                    if (isDragging) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                    const percentage = x / rect.width;
                    let clickedValue = min + percentage * (max - min);
                    clickedValue = Math.round(clickedValue / step) * step;

                    if (Math.abs(clickedValue - value[0]) < Math.abs(clickedValue - value[1])) {
                        onChange([Math.min(clickedValue, value[1] - step), value[1]]);
                    } else {
                        onChange([value[0], Math.max(clickedValue, value[0] + step)]);
                    }
                }}
            >
                {/* Track Active */}
                <div
                    className="absolute h-full bg-primary-500 rounded-full pointer-events-none transition-all duration-75"
                    style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }}
                />

                {/* Min Handle */}
                <motion.div
                    animate={isDragging === 'min' ? { scale: 1.2 } : { scale: 1 }}
                    className="absolute top-1/2 -mt-3.5 -ml-3.5 w-7 h-7 bg-white dark:bg-slate-900 border-2 border-primary-500 rounded-full shadow hover:scale-110 cursor-grab active:cursor-grabbing z-10 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
                    style={{ left: `${minPos}%` }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setIsDragging('min');
                    }}
                    tabIndex={0}
                />

                {/* Max Handle */}
                <motion.div
                    animate={isDragging === 'max' ? { scale: 1.2 } : { scale: 1 }}
                    className="absolute top-1/2 -mt-3.5 -ml-3.5 w-7 h-7 bg-white dark:bg-slate-900 border-2 border-primary-500 rounded-full shadow hover:scale-110 cursor-grab active:cursor-grabbing z-10 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
                    style={{ left: `${maxPos}%` }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setIsDragging('max');
                    }}
                    tabIndex={0}
                />
            </div>

            {/* Values Display */}
            <div className="flex justify-between mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                <span>{formatValue ? formatValue(value[0]) : value[0]}</span>
                <span>{formatValue ? formatValue(value[1]) : value[1]}</span>
            </div>
        </div>
    );
};
