from django.contrib import admin
from .models import User, UserDevice

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'email', 'first_name', 'is_active']
    search_fields = ['username', 'email']
    list_filter = ['is_active', 'is_staff']

@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'device_id', 'is_active']