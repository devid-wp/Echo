from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home_view(request):
    return JsonResponse({'status': 'ok', 'message': 'Echo API is running!'})

urlpatterns = [
    path('', home_view),
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('chats.urls')),
    path('api/', include('ai.urls')),
]