from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from houses.models import House
from preferences.models import UserPreference

User = get_user_model()

class HomeSyncAITestCase(APITestCase):
    def setUp(self):
        # Create a test house in Mumbai
        self.house1 = House.objects.create(
            title="Premium Apartment in Bandra",
            city="Mumbai",
            area="Bandra",
            price=15000000.00,
            bedrooms=3,
            bathrooms=3,
            square_feet=1500,
            property_type="Apartment",
            latitude=19.0596,
            longitude=72.8295,
            amenities=["Parking", "Gym", "Pool"],
            description="Luxury apartment with premium views"
        )
        # Create a test house in Delhi
        self.house2 = House.objects.create(
            title="Elegant Villa in Saket",
            city="Delhi",
            area="Saket",
            price=25000000.00,
            bedrooms=4,
            bathrooms=4,
            square_feet=3000,
            property_type="Villa",
            latitude=28.5245,
            longitude=77.2066,
            amenities=["Parking", "Garden"],
            description="Spacious elegant family home"
        )
        
        self.signup_url = reverse('signup')
        self.login_url = reverse('login')
        self.profile_url = reverse('profile')
        self.preferences_url = reverse('user-preference')
        self.recommendations_url = reverse('recommendations')

    def test_full_user_flow(self):
        # 1. Signup
        signup_data = {
            "full_name": "Test User",
            "email": "testuser@example.com",
            "password": "TestPassword123!",
            "confirm_password": "TestPassword123!"
        }
        response = self.client.post(self.signup_url, signup_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "User created successfully")

        # 2. Login
        login_data = {
            "email": "testuser@example.com",
            "password": "TestPassword123!"
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        access_token = response.data["access"]

        # Authenticate future requests
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        # 3. Profile
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "testuser@example.com")
        self.assertEqual(response.data["full_name"], "Test User")

        # 4. Preferences Setup
        pref_data = {
            "buyer_type": "first-time",
            "min_budget": 10000000.00,
            "max_budget": 20000000.00,
            "city": "Mumbai",
            "latitude": 19.0596,
            "longitude": 72.8295,
            "search_radius": 10.0,
            "property_type": ["apartment"],
            "bedrooms": ["3"],
            "amenities": ["Parking", "Gym"],
            "lifestyle": ["Luxury"]
        }
        response = self.client.post(self.preferences_url, pref_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Recommendations API
        response = self.client.get(self.recommendations_url, {"city": "Mumbai"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that we received Mumbai properties in preferences search radius
        self.assertTrue(len(response.data) > 0)
        self.assertEqual(response.data[0]["id"], self.house1.id)
        # Ensure match score calculations exists and is higher than fallback
        self.assertIn("match_score", response.data[0])
        self.assertTrue(response.data[0]["match_score"] > 40)

        # 6. Save a house
        save_response = self.client.post(reverse('save-house'), {"house_id": self.house1.id}, format='json')
        self.assertEqual(save_response.status_code, status.HTTP_201_CREATED)

        # 7. List saved houses
        saved_list_response = self.client.get(reverse('saved-list'))
        self.assertEqual(saved_list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(saved_list_response.data), 1)
        self.assertEqual(saved_list_response.data[0]["house"], self.house1.id)

        # 8. Compare houses
        compare_response = self.client.post(reverse('compare-houses'), {"house_ids": [self.house1.id, self.house2.id]}, format='json')
        self.assertEqual(compare_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(compare_response.data), 2)

        # 9. House details with calculated match score
        detail_response = self.client.get(f"/api/houses/{self.house1.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(detail_response.data.get("match_score"))

        # 10. Unsave house
        unsave_response = self.client.delete(reverse('save-house'), {"house_id": self.house1.id}, format='json')
        self.assertEqual(unsave_response.status_code, status.HTTP_204_NO_CONTENT)

