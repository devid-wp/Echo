from django.urls import path
from users.views import RegisterView, LoginView, MeView, UploadAvatarView, LogoutView, UserDetailView, UserListView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/register', RegisterView.as_view()),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/login', LoginView.as_view()),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/logout', LogoutView.as_view()),
    path('users/me/', MeView.as_view(), name='me'),
    path('users/me', MeView.as_view()),
    path('users/me/avatar/', UploadAvatarView.as_view(), name='upload-avatar'),
    path('users/me/avatar', UploadAvatarView.as_view()),
    path('users/<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>', UserDetailView.as_view()),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users', UserListView.as_view()),
]