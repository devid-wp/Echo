from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from .services import DeepSeekService
from chats.models import Chat, Message


class SmartReplyView(APIView):
    """
    Генерация умного ответа
    POST /api/ai/reply/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        message = request.data.get('message')
        context = request.data.get('context')
        user_name = request.data.get('user_name')
        
        if not message:
            return Response(
                {"code": "validation", "message": "Message required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что контент безопасен
        is_safe, score, reason = DeepSeekService.moderate_content(message)
        if not is_safe:
            return Response({
                "code": "moderation_failed",
                "message": "Content blocked: " + reason
            }, status=status.HTTP_400_BAD_REQUEST)
        
        reply = DeepSeekService.generate_reply(message, context, user_name)
        
        if reply:
            return Response({
                "reply": reply,
                "model": "deepseek-v4"
            })
        else:
            return Response(
                {"code": "ai_error", "message": "AI service unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class ContentModerationView(APIView):
    """
    Проверка контента
    POST /api/ai/moderate/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        text = request.data.get('text')
        
        if not text:
            return Response(
                {"code": "validation", "message": "Text required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_safe, score, reason = DeepSeekService.moderate_content(text)
        
        return Response({
            "is_safe": is_safe,
            "score": score,
            "reason": reason
        })


class ChatSummaryView(APIView):
    """
    Суммаризация чата
    GET /api/ai/summary/<chat_id>/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, chat_id):
        # Проверяем доступ к чату
        chat = Chat.objects.filter(
            id=chat_id,
            participants=request.user
        ).first()
        
        if not chat:
            return Response(
                {"code": "not_found", "message": "Chat not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Получаем последние сообщения
        messages = Message.objects.filter(
            chat=chat
        ).order_by('-created_at')[:50]
        
        if not messages:
            return Response(
                {"code": "no_messages", "message": "No messages to summarize"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Форматируем сообщения
        text_messages = []
        for msg in reversed(messages):
            sender_name = msg.sender.first_name or msg.sender.username
            text_messages.append(f"{sender_name}: {msg.text}")
        
        summary = DeepSeekService.summarize_chat("\n".join(text_messages))
        
        if summary:
            return Response({
                "summary": summary,
                "message_count": messages.count()
            })
        else:
            return Response(
                {"code": "ai_error", "message": "AI service unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class GenerateTitleView(APIView):
    """
    Генерация названия для чата
    POST /api/ai/title/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        chat_id = request.data.get('chat_id')
        
        if not chat_id:
            return Response(
                {"code": "validation", "message": "chat_id required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        chat = Chat.objects.filter(
            id=chat_id,
            participants=request.user
        ).first()
        
        if not chat:
            return Response(
                {"code": "not_found", "message": "Chat not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Получаем последние сообщения
        messages = Message.objects.filter(
            chat=chat
        ).order_by('-created_at')[:10]
        
        if not messages:
            return Response(
                {"code": "no_messages", "message": "No messages"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        text_messages = []
        for msg in reversed(messages):
            text_messages.append(msg.text)
        
        title = DeepSeekService.generate_chat_title(" ".join(text_messages))
        
        if title:
            # Обновляем название чата
            chat.name = title
            chat.save()
            
            return Response({
                "title": title,
                "chat_id": chat.id
            })
        else:
            return Response(
                {"code": "ai_error", "message": "AI service unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class TranslateView(APIView):
    """
    Перевод сообщения
    POST /api/ai/translate/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        text = request.data.get('text')
        target_language = request.data.get('target_language', 'russian')
        
        if not text:
            return Response(
                {"code": "validation", "message": "Text required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        translated = DeepSeekService.translate_message(text, target_language)
        
        if translated:
            return Response({
                "original": text,
                "translated": translated,
                "language": target_language
            })
        else:
            return Response(
                {"code": "ai_error", "message": "AI service unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class StickerSuggestionView(APIView):
    """
    Предложение эмодзи к сообщению
    POST /api/ai/sticker/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        text = request.data.get('text')
        
        if not text:
            return Response(
                {"code": "validation", "message": "Text required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sticker = DeepSeekService.generate_sticker_suggestion(text)
        
        if sticker:
            return Response({
                "text": text,
                "sticker": sticker
            })
        else:
            return Response(
                {"code": "ai_error", "message": "AI service unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )