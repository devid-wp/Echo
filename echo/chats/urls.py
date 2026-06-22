from django.urls import path
from .views import ChatViewSet, MessageViewSet, mark_chat_read


# Ручные маршруты (без trailing slash) для соответствия фронтовому контракту.
urlpatterns = [
    path('chats', ChatViewSet.as_view({'get': 'list', 'post': 'create'}), name='chat-list'),
    path('chats/<int:pk>',
         ChatViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='chat-detail'),
    path('chats/<int:chat_pk>/messages',
         MessageViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='message-list'),
    path('chats/<int:chat_pk>/read', mark_chat_read, name='chat-read'),
]
