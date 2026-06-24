from django.urls import path
from .views import FeedView, PostLikeView

urlpatterns = [
    path('feed', FeedView.as_view(), name='feed-list'),
    path('feed/', FeedView.as_view(), name='feed-list-slash'),
    path('feed/<int:pk>/like/', PostLikeView.as_view(), name='feed-like'),
]
