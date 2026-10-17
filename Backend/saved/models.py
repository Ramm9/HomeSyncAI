from django.db import models
from django.conf import settings
from houses.models import House

class SavedHouse(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_houses')
    house = models.ForeignKey(House, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'house')

    def __str__(self):
        return f"{self.user.email} saved {self.house.title}"
