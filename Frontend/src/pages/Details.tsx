import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Heart, Share2, MapPin,
    Bed, Bath, Square, Car, Waves, ChevronRight, ChevronLeft, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AIScoreRing } from '../components/ui/AIScoreRing';
import { fetchApi } from '../utils/api';
import { Skeleton } from '../components/ui/Spinner';
import { AgentContactModal } from '../components/AgentContactModal';
import { ScheduleTourModal } from '../components/ScheduleTourModal';
import { SharePropertyModal } from '../components/SharePropertyModal';

const MOCK_IMAGES = [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
    'https://images.unsplash.com/photo-1600607687931-cebf5871f58a?w=1200',
    'https://images.unsplash.com/photo-1600607687644-aac4c1566f55?w=1200',
    'https://images.unsplash.com/photo-1600566753086-00f18ef22087?w=1200'
];

const Details = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [house, setHouse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentImage, setCurrentImage] = useState(0);
    const [isSaved, setIsSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [showTourModal, setShowTourModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Initialize house details and check if it is saved on the backend
    useEffect(() => {
        const fetchHouse = async () => {
            try {
                setLoading(true);
                const [data, savedData] = await Promise.all([
                    fetchApi(`/houses/${id}/`),
                    fetchApi('/saved/').catch(() => [])
                ]);
                setHouse(data);
                const savedIds = new Set((savedData || []).map((item: any) => item.house));
                setIsSaved(savedIds.has(data.id));
                setLoading(false);
            } catch (err: any) {
                console.error('Error fetching house details:', err);
                setError(err.message || 'Failed to load house details');
                setLoading(false);
            }
        };

        if (id) fetchHouse();
    }, [id]);

    const formatPrice = (price: number) => {
        if (!price) return 'N/A';
        if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
        return `₹${(price / 100000).toFixed(2)} L`;
    };

    const toggleSave = async () => {
        if (!house) return;
        
        const isCurrentlySaved = isSaved;
        setIsSaved(!isCurrentlySaved);
        setToastMessage(isCurrentlySaved ? "Property removed from favorites" : "Property saved to favorites!");
        
        // Auto hide toast
        const toastTimeout = setTimeout(() => {
            setToastMessage(null);
        }, 3000);

        try {
            if (isCurrentlySaved) {
                // Unsave (DELETE)
                await fetchApi('/saved/add/', {
                    method: 'DELETE',
                    body: JSON.stringify({ house_id: house.id })
                });
                
                // Sync localStorage for fallback compatibility
                let saved: number[] = JSON.parse(localStorage.getItem("savedProperties") || "[]");
                saved = saved.filter(savedId => savedId !== house.id);
                localStorage.setItem("savedProperties", JSON.stringify(saved));
            } else {
                // Save (POST)
                await fetchApi('/saved/add/', {
                    method: 'POST',
                    body: JSON.stringify({ house_id: house.id })
                });

                // Sync localStorage for fallback compatibility
                const saved: number[] = JSON.parse(localStorage.getItem("savedProperties") || "[]");
                if (!saved.includes(house.id)) {
                    saved.push(house.id);
                    localStorage.setItem("savedProperties", JSON.stringify(saved));
                }
            }
        } catch (err) {
            console.error("Failed to toggle save on backend:", err);
            // Rollback optimistic state and toast on error
            setIsSaved(isCurrentlySaved);
            clearTimeout(toastTimeout);
            setToastMessage("Failed to update saved status. Please try again.");
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const nextImage = () => {
        const imagesCount = house?.image_url ? 1 : MOCK_IMAGES.length;
        setCurrentImage(curr => (curr + 1) % imagesCount);
    };
    const prevImage = () => {
        const imagesCount = house?.image_url ? 1 : MOCK_IMAGES.length;
        setCurrentImage(curr => curr === 0 ? imagesCount - 1 : curr - 1);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 px-4 flex flex-col items-center transition-colors">
                <Skeleton className="h-[60vh] w-full max-w-7xl rounded-3xl mb-8" />
                <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !house) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
                <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Oops!</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">{error || 'House not found'}</p>
                    <Button onClick={() => navigate('/results')}>Back to Results</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors duration-300">
            {/* Top Navbar Contextual */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    <ArrowLeft size={20} /> <span className="font-medium hidden sm:inline">Back to Results</span>
                </button>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowShareModal(true)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <Share2 size={20} />
                    </button>
                    <button
                        onClick={toggleSave}
                        className={`p-2 rounded-full transition-colors flex items-center justify-center gap-2 px-4 shadow-sm border ${isSaved ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <Heart size={18} className={isSaved ? 'fill-red-500' : ''} />
                        {isSaved ? 'Saved' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg font-medium flex items-center gap-2 border border-slate-700"
                    >
                        <CheckCircle size={18} className="text-green-400" />
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero Image Carousel */}
            <div className="relative h-[40vh] md:h-[60vh] w-full bg-slate-900 overflow-hidden group">
                <AnimatePresence initial={false} mode="wait">
                    <motion.img
                        key={currentImage}
                        src={house.image_url || MOCK_IMAGES[currentImage]}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full object-cover"
                    />
                </AnimatePresence>

                {/* Carousel Controls */}
                {(house.image_url ? 1 : MOCK_IMAGES.length) > 1 && (
                    <>
                        <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-3 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-3 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100">
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}

                {/* Thumbnails */}
                {(house.image_url ? 1 : MOCK_IMAGES.length) > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {(house.image_url ? [house.image_url] : MOCK_IMAGES).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentImage(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${currentImage === idx ? 'w-8 bg-white' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Details */}
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-3 text-sm font-medium">
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">For Sale</span>
                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><MapPin size={16} /> {house.area}, {house.city}</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">{house.title}</h1>
                        <div className="flex gap-6 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-6">
                            <span className="flex items-center gap-2"><Bed className="text-primary-500" /> <strong>{house.bedrooms}</strong> Beds</span>
                            <span className="flex items-center gap-2"><Bath className="text-primary-500" /> <strong>{house.bathrooms}</strong> Baths</span>
                            <span className="flex items-center gap-2"><Square className="text-primary-500" /> <strong>{house.square_feet}</strong> sqft</span>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">About this home</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">{house.description || 'No description available for this property.'}</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Amenities</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {(house.amenities || []).map((am: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                                        {i % 2 === 0 ? <Car size={16} /> : <Waves size={16} />}
                                    </div>
                                    <span className="font-medium text-sm">{am}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Map Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Location</h2>
                        <div className="w-full h-[350px] rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800">
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                src={`https://www.google.com/maps?q=${house.city}&z=13&output=embed`}
                            ></iframe>
                        </div>
                    </div>
                </div>

                {/* Right Col: Sticky Sidebar */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">

                        {/* Price Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-none">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Asking Price</p>
                            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">{formatPrice(house.price)}</h2>

                            {house.price < 40000000 && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 mb-6 border border-green-100 dark:border-green-900/30 flex items-start gap-4">
                                    <div className="mt-1">
                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 font-bold">✓</div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-green-800 dark:text-green-300">Great Deal!</h4>
                                        <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                                            This property is priced competitively for the {house.area} area.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Button size="lg" className="w-full text-lg mb-3" magnetic onClick={() => setShowAgentModal(true)}>Contact Agent</Button>
                            <Button size="lg" variant="outline" className="w-full" onClick={() => setShowTourModal(true)}>Schedule Tour</Button>
                        </div>

                        {/* AI Score Card */}
                        <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative border border-slate-800 shadow-lg">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl" />
                            <h3 className="text-xl font-bold mb-6 relative z-10 flex items-center justify-between">
                                AI Match Score
                                <span className="text-xs bg-white/20 px-2 py-1 rounded text-slate-300 font-normal">Based on your prefs</span>
                            </h3>

                            <div className="flex flex-col items-center justify-center relative z-10 mb-6">
                                <AIScoreRing score={house.match_score !== undefined && house.match_score !== null ? house.match_score : (house.score || 85)} size={140} />
                            </div>
 
                            <div className="space-y-3 relative z-10 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Budget Match</span>
                                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${house.match_breakdown?.budget !== undefined ? (house.match_breakdown.budget / 25 * 100) : 95}%` }} />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Location Match</span>
                                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${house.match_breakdown?.location !== undefined ? (house.match_breakdown.location / 20 * 100) : 70}%` }} />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Lifestyle Fit</span>
                                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${house.match_breakdown?.lifestyle !== undefined ? (house.match_breakdown.lifestyle / 10 * 100) : 88}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Modals */}
            <AgentContactModal 
                isOpen={showAgentModal} 
                onClose={() => setShowAgentModal(false)} 
            />
            <ScheduleTourModal
                isOpen={showTourModal}
                onClose={() => setShowTourModal(false)}
                propertyId={id || ''}
            />
            {house && (
                <SharePropertyModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    property={house}
                />
            )}
        </div>
    );
};

export default Details;
