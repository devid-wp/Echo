from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

# Первая моделььььь
class User(AbstractUser):
    # Кастом поля 
    birth_date = models.DateField(null=True, blank=True, verbose_name="Дата рождения")
    bio = models.TextField(max_length=500, blank=True, verbose_name="О себе")
    last_seen = models.DateTimeField(auto_now=True, verbose_name="Последнее посещение")
    online_status = models.BooleanField(default=False, verbose_name="В сети?")

    # !!! БЕЗОПАСНОСТЬ !!!
    public_key = models.TextField(blank=True, null=True, verbose_name="Публичный ключ RSA/ECC")
    # !!! БЕЗОПАСНОСТЬ !!!

    def __str__(self):
        return self.username

# Если у пользователя более одного устройства, для безопасности
# ОТСЫЛОЧКА НА DEVICE_FRIEND ! ! ! ! ! ! ! ! ! ! ! ! !
class UserDevice(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='devices'
    )
    device_id = models.CharField(max_length=255, unique=True)
    public_key = models.TextField()  # ! ! ! ! ! Ключ конкретного устройства ! ! ! ! !
    user_agent = models.TextField(blank=True)
    last_active = models.DateTimeField(auto_now=True) # Последняя активность
    is_active = models.BooleanField(default=True) # Активен ли
    
    def __str__(self):
        return f"{self.user.username} - {self.device_id[:10]}"
