from houses.models import House
from preferences.models import UserPreference
from core.utils import haversine
import json

def calculate_match_score(house, preferences):
    score = 0
    breakdown = {}

    # 1. Budget Match (25 Points)
    budget_score = 0
    min_b = preferences.min_budget or 0
    max_b = preferences.max_budget or float('inf')
    if min_b <= house.price <= max_b:
        budget_score = 25
    elif house.price > max_b:
        # Penalize if it's over budget, but give partial points if it's within 10%
        if house.price <= float(max_b) * 1.1:
            budget_score = 10
    elif house.price < min_b:
        # Might still be good if it's cheaper
        budget_score = 25 
    
    score += budget_score
    breakdown['budget'] = budget_score

    # 2. Bedrooms (15 Points)
    bed_score = 0
    # preferences.bedrooms is stored as JSON list e.g. ["1", "2"] or ["4+"]
    pref_beds = preferences.bedrooms if isinstance(preferences.bedrooms, list) else []
    house_bed_str = str(house.bedrooms)
    if house_bed_str in pref_beds or (house.bedrooms >= 4 and "4+" in pref_beds):
        bed_score = 15
    elif pref_beds:
        # Partial points if close (e.g. wants 2, house is 3)
        # simplistic approach
        try:
            target_beds = [int(b) for b in pref_beds if b.isdigit()]
            if target_beds and any(abs(house.bedrooms - b) <= 1 for b in target_beds):
                bed_score = 5
        except:
            pass
            
    score += bed_score
    breakdown['bedrooms'] = bed_score

    # 3. Property Type (15 Points)
    prop_score = 0
    pref_props = preferences.property_type if isinstance(preferences.property_type, list) else []
    if house.property_type.lower() in [p.lower() for p in pref_props]:
        prop_score = 15
    score += prop_score
    breakdown['property_type'] = prop_score

    # 4. Location Distance (20 Points)
    loc_score = 0
    if preferences.latitude and preferences.longitude and house.latitude and house.longitude:
        distance = haversine(
            float(preferences.latitude), 
            float(preferences.longitude), 
            float(house.latitude), 
            float(house.longitude)
        )
        if distance <= preferences.search_radius:
            loc_score = 20
        elif distance <= preferences.search_radius * 1.5:
            loc_score = 10 # Half points if slightly outside radius
    else:
        # If coordinates are missing, check if cities match
        if preferences.city.lower() in house.city.lower() or preferences.city.lower() in house.area.lower():
            loc_score = 10
            
    score += loc_score
    breakdown['location'] = loc_score

    # 5. Amenities (15 Points)
    amenity_score = 0
    pref_amenities = set(preferences.amenities) if isinstance(preferences.amenities, list) else set()
    house_amenities = set(house.amenities) if isinstance(house.amenities, list) else set()
    
    if pref_amenities:
        match_count = len(pref_amenities.intersection(house_amenities))
        ratio = match_count / len(pref_amenities)
        amenity_score = int(15 * ratio)
    else:
        amenity_score = 15 # If no preference, give full points assuming they don't care
        
    score += amenity_score
    breakdown['amenities'] = amenity_score

    # 6. Lifestyle (10 Points)
    # This involves NLP or tag matching. We'll simulate by checking if lifestyle tags exist in description/amenities
    lifestyle_score = 0
    pref_lifestyle = preferences.lifestyle if isinstance(preferences.lifestyle, list) else []
    if pref_lifestyle:
        desc = (house.description or "").lower()
        matches = 0
        for tag in pref_lifestyle:
            if tag.lower() in desc:
                matches += 1
        
        ratio = matches / len(pref_lifestyle) if len(pref_lifestyle) > 0 else 0
        # Give some base points just for trying, max 10
        lifestyle_score = min(10, int(10 * ratio))
    else:
        lifestyle_score = 10
        
    score += lifestyle_score
    breakdown['lifestyle'] = lifestyle_score

    return {"score": score, "breakdown": breakdown}

def get_recommendations_for_user(user, city_filter=None):
    try:
        preferences = UserPreference.objects.get(user=user)
    except UserPreference.DoesNotExist:
        return []

    houses = House.objects.all()
    if city_filter:
        houses = houses.filter(city__icontains=city_filter)
    elif preferences.city:
        houses = houses.filter(city__icontains=preferences.city)
    
    # Strict filtering by location if coordinates are provided
    if preferences.latitude and preferences.longitude:
        filtered_houses = []
        user_lat = float(preferences.latitude)
        user_lon = float(preferences.longitude)
        radius = float(preferences.search_radius)
        
        for house in houses:
            if house.latitude and house.longitude:
                dist = haversine(user_lat, user_lon, float(house.latitude), float(house.longitude))
                if dist <= radius:
                    filtered_houses.append(house)
        houses = filtered_houses

    recommendations = []

    for house in houses:
        match_data = calculate_match_score(house, preferences)
        
        # We only want to recommend houses that have a reasonably good score, e.g. > 40
        if match_data['score'] >= 40:
            recommendations.append({
                "house": house,
                "match_score": match_data['score'],
                "match_breakdown": match_data['breakdown']
            })

    # Sort descending by match score
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    return recommendations
