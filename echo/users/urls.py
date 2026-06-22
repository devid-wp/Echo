
from users.views import RegisterView, LoginView, MeView, UploadAvatarView, LogoutView, UserDetailView
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('auth/register', RegisterView.as_view()),
    path('auth/login', LoginView.as_view()),
    path('users/me', MeView.as_view()),
    path('users/me/avatar', UploadAvatarView.as_view(), name='avatar'),
    path('auth/logout', LogoutView.as_view(), name='logout'),
    path('users/<int:user_id>', UserDetailView.as_view(), name='user-detail'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
