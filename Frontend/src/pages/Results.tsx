import { useState, useEffect } from 'react';
import { Filter, Map as MapIcon, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Spinner';
import { Link, useSearchParams } from 'react-router-dom';
import { ChromaGrid, type ChromaGridItem } from '../components/ui/ChromaGrid';
import { fetchApi } from '../utils/api';
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = "AIzaSyDCfKoaqxficeuaZx4gJ11USC2IPm5DZEA";
const mapContainerStyle = {
    width: "100%",
    height: "600px",
};

// The PropertyCardRenderer has been replaced by the ChromaGrid component which encapsulates the card UI.

const Results = () => {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [houses, setHouses] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const [error, setError] = useState<string | null>(null);
    const [currentCity, setCurrentCity] = useState<string>('');

    const fetchRecommendations = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Read city from search URL param or localStorage
            let city = searchParams.get('city') || '';
            if (!city) {
                const storageData = localStorage.getItem("searchData");
                if (storageData) {
                    try {
                        const parsed = JSON.parse(storageData);
                        city = parsed.city || '';
                    } catch (e) {
                        console.error("Error parsing searchData:", e);
                    }
                }
            }
            if (!city) {
                const wizardDataStr = localStorage.getItem("wizard_data");
                if (wizardDataStr) {
                    try {
                        const parsed = JSON.parse(wizardDataStr);
                        city = parsed.location?.city || '';
                    } catch (e) {
                        console.error("Error parsing wizard_data:", e);
                    }
                }
            }

            setCurrentCity(city);

            // 2. Fetch recommendations or public houses from backend
            let rawData: any = null;
            if (city) {
                try {
                    rawData = await fetchApi(`/houses/recommendations/?city=${encodeURIComponent(city)}`);
                } catch (recErr) {
                    console.warn("Recommendations endpoint returned error, falling back to public houses API:", recErr);
                }
            }

            // Fallback to /houses/?city=... or /houses/ if recommendations returned no items
            const initialList = Array.isArray(rawData) ? rawData : (rawData?.results || []);
            if (initialList.length === 0) {
                const houseUrl = city ? `/houses/?city=${encodeURIComponent(city)}&page_size=50` : `/houses/?page_size=50`;
                rawData = await fetchApi(houseUrl);
            }

            // Fetch saved properties if user is logged in
            const savedData = await fetchApi('/saved/').catch(() => []);
            const rawSaved = Array.isArray(savedData) ? savedData : (savedData?.results || []);
            const savedIds = new Set(rawSaved.map((item: any) => item?.house).filter(Boolean));
            
            // Map the API response to fit the frontend structure using actual model fields
            const rawHouses = Array.isArray(rawData) ? rawData : (rawData?.results || []);
            const mappedHouses = rawHouses.map((item: any) => ({
                id: item.id,
                title: item.title,
                price: parseFloat(item.price) || 0,
                score: item.match_score || 95, // Dynamic score from AI matches or 95 default
                beds: item.bedrooms,
                baths: item.bathrooms,
                area: item.square_feet,
                location: item.area ? `${item.area}, ${item.city}` : item.city,
                latitude: item.latitude,
                longitude: item.longitude,
                image: item.image_url || 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
                isSaved: savedIds.has(item.id),
                propertyType: item.property_type,
                amenities: item.amenities || [],
                description: item.description || '',
                details: item
            }));
            setHouses(mappedHouses);
        } catch (err: any) {
            console.error('Error fetching houses:', err);
            setError(err.message || 'Failed to load house listings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecommendations();
    }, [searchParams]);

    const toggleSave = async (id: number | string) => {
        const numId = Number(id);
        const house = houses.find(h => h.id === numId);
        if (!house) return;

        const isCurrentlySaved = house.isSaved;
        
        // Optimistic UI update
        setHouses(prev => prev.map(h => h.id === numId ? { ...h, isSaved: !isCurrentlySaved } : h));

        try {
            if (isCurrentlySaved) {
                // Unsave (DELETE)
                await fetchApi('/saved/add/', {
                    method: 'DELETE',
                    body: JSON.stringify({ house_id: numId })
                });
            } else {
                // Save (POST)
                await fetchApi('/saved/add/', {
                    method: 'POST',
                    body: JSON.stringify({ house_id: numId })
                });
            }
        } catch (err) {
            console.error('Error toggling save:', err);
            // Rollback on error
            setHouses(prev => prev.map(h => h.id === numId ? { ...h, isSaved: isCurrentlySaved } : h));
        }
    };

    const formatPrice = (price: number) => {
        if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
        return `₹${(price / 100000).toFixed(2)} L`;
    };

    // Calculate segments based on budget
    const userBudgetStr = localStorage.getItem("userBudget");
    const userBudget = userBudgetStr ? JSON.parse(userBudgetStr) : null;
    let minBudget = userBudget?.min || 0;
    let maxBudget = userBudget?.max || Infinity;

    if (!userBudget && localStorage.getItem("wizard_data")) {
        try {
            const wiz = JSON.parse(localStorage.getItem("wizard_data") || "{}");
            if (wiz.budget) {
                minBudget = Array.isArray(wiz.budget) ? wiz.budget[0] : (wiz.budget.min || 0);
                maxBudget = Array.isArray(wiz.budget) ? wiz.budget[1] : (wiz.budget.max || Infinity);
            }
        } catch (e) {
            console.error("Error parsing budget from wizard_data:", e);
        }
    }

    const inBudget = houses.filter((p) => p.price >= minBudget && p.price <= maxBudget);
    const belowBudget = houses.filter((p) => p.price < minBudget);
    const aboveBudget = houses.filter((p) => p.price > maxBudget);

    const mapHouseToChromaItem = (house: any): ChromaGridItem => ({
        id: house.id,
        image: house.image,
        title: house.title,
        subtitle: house.location,
        priceStr: formatPrice(house.price),
        score: house.score,
        beds: house.beds,
        baths: house.baths,
        area: house.area,
        isSaved: house.isSaved,
        tag: "AI Verified",
        borderColor: '#3B82F6',
        gradient: 'rgba(59, 130, 246, 0.15)'
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20 pb-24 transition-colors duration-300">
            {/* Sticky Filter Bar */}
            <div className="sticky top-[64px] z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm py-4">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                        <Link to="/wizard" className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700">
                            <Filter size={16} /> Edit Preferences
                        </Link>
                        <div className="hidden md:flex items-center gap-2">
                            <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium whitespace-nowrap border border-primary-100 dark:border-primary-800">
                                ₹50L - ₹2Cr
                            </span>
                            <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium whitespace-nowrap border border-primary-100 dark:border-primary-800">
                                2, 3 BHK
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            Sort by: Match <ChevronDown size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')}
                            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-colors border ${viewMode === 'map' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            <MapIcon size={16} /> {viewMode === 'grid' ? 'Map View' : 'Grid View'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-8">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {currentCity ? `Properties in ${currentCity}` : "All Available Properties"}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            {currentCity ? `We found properties matching your search in ${currentCity}.` : "Explore real properties directly fetched from our verified database."}
                        </p>
                    </div>
                </div>

                {loading ? (
                    // Skeleton Grid
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 h-[400px] flex flex-col">
                                <Skeleton className="h-48 w-full rounded-xl mb-4" />
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2 mb-6" />
                                <div className="mt-auto flex justify-between">
                                    <Skeleton className="h-8 w-1/3" />
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="text-red-500 mb-4 text-lg font-semibold">Error Loading Listings</div>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">{error}</p>
                        <Button onClick={fetchRecommendations} variant="primary">Try Again</Button>
                    </div>
                ) : houses.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="text-slate-400 mb-4 text-lg font-semibold">No Properties Found</div>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">Try adjusting your filters or browse listings across other cities.</p>
                        <Link to="/wizard">
                            <Button variant="primary">Go to Wizard</Button>
                        </Link>
                    </div>
                ) : viewMode === 'map' ? (
                    <div className="h-[600px] w-full bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 relative">
                        <MapDisplay houses={houses} />
                    </div>
                ) : (
                    <>
                        <div className="space-y-12 w-full">
                            {/* In Budget Section */}
                            <div>
                                {inBudget.length > 0 ? (
                                    <>
                                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">
                                            {userBudget ? "In Your Budget" : "Featured Properties"}
                                        </h2>
                                        <ChromaGrid 
                                            items={inBudget.map(mapHouseToChromaItem)} 
                                            onToggleSave={toggleSave} 
                                        />
                                    </>
                                ) : houses.length > 0 ? (
                                    <>
                                        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center mb-8">
                                            <p className="text-slate-600 dark:text-slate-400 font-medium">No properties match your custom price bracket. Showing all available homes below.</p>
                                        </div>
                                        <ChromaGrid 
                                            items={houses.map(mapHouseToChromaItem)} 
                                            onToggleSave={toggleSave} 
                                        />
                                    </>
                                ) : (
                                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center mb-8">
                                        <p className="text-slate-600 dark:text-slate-400 font-medium">No properties found.</p>
                                    </div>
                                )}
                            </div>

                            {/* Below Budget Section */}
                            {belowBudget.length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Below Budget Deals</h2>
                                    <ChromaGrid 
                                        items={belowBudget.slice(0, 4).map(mapHouseToChromaItem)} 
                                        onToggleSave={toggleSave} 
                                    />
                                </div>
                            )}

                            {/* Above Budget Section */}
                            {aboveBudget.length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Slightly Above Budget Options</h2>
                                    <ChromaGrid 
                                        items={aboveBudget.slice(0, 4).map(mapHouseToChromaItem)} 
                                        onToggleSave={toggleSave} 
                                    />
                                </div>
                            )}
                        </div>

                        {/* Load More Trigger - Removed as pagination is not implemented */}
                    </>
                )}
            </div>
        </div>
    );
};

const MapDisplay = ({ houses }: { houses: any[] }) => {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    });

    const searchData = JSON.parse(localStorage.getItem("searchData") || "{}");
    const center = {
        lat: searchData.lat || 12.9716,
        lng: searchData.lng || 77.5946
    };

    return isLoaded ? (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={12}
            options={{
                disableDefaultUI: false,
                zoomControl: true,
            }}
        >
            {houses.map((house) => (
                house.latitude && house.longitude && (
                    <Marker
                        key={house.id}
                        position={{ 
                            lat: parseFloat(house.latitude), 
                            lng: parseFloat(house.longitude) 
                        }}
                        title={house.title}
                    />
                )
            ))}
        </GoogleMap>
    ) : (
        <div className="w-full h-full flex items-center justify-center">
            <p className="text-slate-500">Loading Map...</p>
        </div>
    );
};

export default Results;
