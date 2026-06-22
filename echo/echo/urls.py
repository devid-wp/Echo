from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.http import JsonResponse

def home_view(request):
    """Корневой URL с информацией об API"""
    return JsonResponse({
        'status': 'ok',
        'message': 'Echo API is running!',
        'endpoints': {
            'auth': {
                'register': 'POST /api/auth/register',
                'login': 'POST /api/auth/login',
                'logout': 'POST /api/auth/logout',
            },
            'users': {
                'me': 'GET /api/users/me',
                'user_detail': 'GET /api/users/<id>',
            },
            'chats': {
                'list': 'GET /api/chats',
                'create': 'POST /api/chats',
                'messages': 'GET /api/chats/<id>/messages',
                'send_message': 'POST /api/chats/<id>/messages',
            },
            'admin': '/admin/'
        },
        'documentation': 'See README.md for more details'
    })


urlpatterns = [
    path('', home_view, name='home'),
    path('admin/', admin.site.urls),
    path('api/', include('chats.urls')),
    path('api/', include('users.urls')),
]

