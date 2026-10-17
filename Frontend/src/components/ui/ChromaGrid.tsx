import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Heart } from 'lucide-react';
import { AIScoreRing } from './AIScoreRing';
import ClickSpark from './ClickSpark';

export interface ChromaGridItem {
    id: number | string;
    image: string;
    title: string;
    subtitle: string;
    priceStr: string;
    score: number;
    beds?: number;
    baths?: number;
    area?: number;
    isSaved?: boolean;
    tag?: string;
    borderColor?: string;
    gradient?: string;
    url?: string;
}

interface ChromaGridProps {
    items: ChromaGridItem[];
    onToggleSave?: (id: number | string) => void;
}

// Sub-component for individual card with spotlight effect
const ChromaCard = ({ 
    item, 
    index, 
    onToggleSave 
}: { 
    item: ChromaGridItem; 
    index: number; 
    onToggleSave?: (id: number | string) => void; 
}) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);
    const navigate = useNavigate();

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current || isFocused) return;
        const div = divRef.current;
        const rect = div.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleFocus = () => {
        setIsFocused(true);
        setOpacity(1);
    };

    const handleBlur = () => {
        setIsFocused(false);
        setOpacity(0);
    };

    const handleMouseEnter = () => {
        setOpacity(1);
        window.dispatchEvent(new CustomEvent('splash-cursor-toggle', { detail: { active: false } }));
    };

    const handleMouseLeave = () => {
        setOpacity(0);
        window.dispatchEvent(new CustomEvent('splash-cursor-toggle', { detail: { active: true } }));
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent navigation if clicking on save button
        if ((e.target as HTMLElement).closest('.save-button')) return;
        
        // Add a slight delay to allow the ClickSpark animation to render
        // before the page unmounts or navigates away.
        setTimeout(() => {
            const path = item.url || `/house/${item.id}`;
            navigate(path);
        }, 300); // 300ms is enough to see the #22c55e sparks
    };

    const overlayColor = item.gradient ? item.gradient : `rgba(59, 130, 246, 0.15)`;
    const borderColor = item.borderColor || '#3B82F6';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, delay: index % 6 * 0.1 }}
            className="h-full"
        >
            <div
                ref={divRef}
                onMouseMove={handleMouseMove}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleCardClick}
                className="relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group property-card"
            >
                {/* Spotlight effect */}
                <div
                    className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-10"
                    style={{
                        opacity,
                        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${overlayColor}, transparent 40%)`,
                    }}
                />

                {/* Animated border on hover */}
                <div 
                    className="absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                    style={{ border: `2px solid ${borderColor}`, borderRadius: '1rem' }}
                />

                <ClickSpark
                    sparkColor="#22c55e"
                    sparkSize={12}
                    sparkRadius={25}
                    sparkCount={12}
                    duration={450}
                >
                    <div className="relative h-56 w-full overflow-hidden shrink-0 z-0">
                        <img
                            src={item.image}
                            alt={item.title}
                            loading="lazy"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80';
                            }}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        
                        {item.tag && (
                            <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-900 dark:text-slate-100 shadow-sm border border-white/50 dark:border-slate-700/50 flex items-center gap-1 z-20">
                                <CheckCircle2 size={12} className="text-primary-600 dark:text-primary-400" /> {item.tag}
                            </div>
                        )}

                        {onToggleSave && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggleSave(item.id);
                                }}
                                className="save-button absolute top-4 right-4 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full shadow-sm border border-white/50 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors z-20 hover:scale-110"
                            >
                                <Heart
                                    size={18}
                                    className={item.isSaved ? 'fill-red-500 text-red-500 animate-pulse' : ''}
                                />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col flex-grow p-5 z-20 bg-white dark:bg-slate-900">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-1">{item.subtitle}</p>
                            </div>
                            <div className="-mt-12 -mr-2 bg-white dark:bg-slate-900 rounded-full p-1 shadow-md shrink-0">
                                <AIScoreRing score={item.score} size={50} />
                            </div>
                        </div>

                        <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400 mb-6">
                            {item.beds !== undefined && <span><strong>{item.beds}</strong> Beds</span>}
                            {item.baths !== undefined && <span><strong>{item.baths}</strong> Baths</span>}
                            {item.area !== undefined && <span><strong>{item.area}</strong> sqft</span>}
                        </div>

                        <div className="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {item.priceStr}
                            </span>
                            <div className="font-semibold text-primary-600 dark:text-primary-400 text-sm group-hover:underline">
                                View Details  →
                            </div>
                        </div>
                    </div>
                </ClickSpark>
            </div>
        </motion.div>
    );
};

export const ChromaGrid = ({ items, onToggleSave }: ChromaGridProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
                {items.map((item, index) => (
                    <ChromaCard 
                        key={item.id} 
                        item={item} 
                        index={index} 
                        onToggleSave={onToggleSave} 
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};
