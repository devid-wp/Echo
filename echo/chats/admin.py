from django.contrib import admin
from .models import Chat, Message

@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ['id', 'type', 'name', 'created_at']
    filter_horizontal = ['participants']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'chat', 'sender', 'text_preview', 'created_at']
    list_filter = ['is_read', 'is_encrypted']
    
    def text_preview(self, obj):
        return obj.text[:50] if obj.text else ''
    text_preview.short_description = 'Text'