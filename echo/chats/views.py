from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from .models import Chat, Message
from .serializers import ChatSerializer, ChatDetailSerializer, MessageSerializer


class ChatViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatSerializer
    
    def get_queryset(self):
        """Только чаты где пользователь участник"""
        return Chat.objects.filter(participants=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChatDetailSerializer
        return ChatSerializer
    
    def create(self, request, *args, **kwargs):
        """Создание чата"""
        other_user_id = request.data.get('other_user_id')
        
        if not other_user_id:
            return Response(
                {"code": "validation", "message": "other_user_id required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, есть ли уже личный чат
        existing = Chat.objects.filter(
            type='private',
            participants=request.user
        ).filter(participants=other_user_id).first()
        
        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data)
        
        # Создаем новый чат
        chat = Chat.objects.create(type='private')
        chat.participants.add(request.user, other_user_id)
        
        serializer = self.get_serializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        """Сообщения из чата где пользователь участник"""
        chat_id = self.kwargs.get('chat_pk')
        chat = Chat.objects.filter(
            id=chat_id,
            participants=self.request.user
        ).first()
        
        if not chat:
            return Message.objects.none()
        
        return Message.objects.filter(chat=chat).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Создание сообщения с автоматическим sender"""
        chat_id = self.kwargs.get('chat_pk')
        chat = Chat.objects.filter(
            id=chat_id,
            participants=self.request.user
        ).first()

        if not chat:
            raise serializers.ValidationError("Chat not found")

        serializer.save(
            sender=self.request.user,
            chat=chat
        )


@api_view(['POST'])
def mark_chat_read(request, chat_pk):
    """
    POST /api/chats/<chat_pk>/read
    Пометить все сообщения чата как прочитанные.
    """
    chat = Chat.objects.filter(
        id=chat_pk,
        participants=request.user
    ).first()

    if not chat:
        return Response(
            {"code": "not_found", "message": "Chat not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Помечаем все непрочитанные сообщения от других
    Message.objects.filter(
        chat=chat,
        is_read=False
    ).exclude(sender=request.user).update(is_read=True)

    return Response(status=status.HTTP_200_OK)
