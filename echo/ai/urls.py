from django.urls import path
from .views import (
    SmartReplyView,
    ContentModerationView,
    ChatSummaryView,
    GenerateTitleView,
    TranslateView,
    StickerSuggestionView
)

urlpatterns = [
    path('ai/reply/', SmartReplyView.as_view(), name='ai-reply'),
    path('ai/moderate/', ContentModerationView.as_view(), name='ai-moderate'),
    path('ai/summary/<int:chat_id>/', ChatSummaryView.as_view(), name='ai-summary'),
    path('ai/title/', GenerateTitleView.as_view(), name='ai-title'),
    path('ai/translate/', TranslateView.as_view(), name='ai-translate'),
    path('ai/sticker/', StickerSuggestionView.as_view(), name='ai-sticker'),
]