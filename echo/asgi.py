import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'echo.settings')

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

django_asgi_app = get_asgi_application()

from chats.consumers import ChatConsumer

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path('ws/chat/<int:chat_id>/', ChatConsumer.as_asgi()),
        ])
    ),
})