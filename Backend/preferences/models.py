from django.db import models
from django.conf import settings

class UserPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='preference')
    buyer_type = models.CharField(max_length=50) # First time buyer, Investor, Family upgrade
    min_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    city = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    search_radius = models.FloatField(default=10.0) # In km
    property_type = models.JSONField(default=list) # e.g. ["apartment", "villa"]
    bedrooms = models.JSONField(default=list) # e.g. ["1", "2"]
    amenities = models.JSONField(default=list) 
    lifestyle = models.JSONField(default=list) 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user.email}"
