
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatViewSet, MessageViewSet, UploadFileView

router = DefaultRouter()
router.register(r'chats', ChatViewSet, basename='chat')
router.register(r'chats/(?P<chat_pk>\d+)/messages', MessageViewSet, basename='message')

# Ручные маршруты (без trailing slash) для соответствия фронтовому контракту.
urlpatterns = [
    path('', include(router.urls)),
    path('upload/', UploadFileView.as_view(), name='upload'),
]
