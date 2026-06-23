from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Chat, Message
from .serializers import ChatSerializer, ChatDetailSerializer, MessageSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from core.upload import upload_file, validate_file

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

    @action(detail=False, methods=['post'], url_path='groups')
    def create_group(self, request):
        """Создание группового чата"""
        name = request.data.get('name')
        participant_ids = request.data.get('participants', [])
        group_key_encrypted = request.data.get('group_key_encrypted', None)
        
        if not name or not name.strip():
            return Response(
                {"code": "validation", "message": "Group name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not participant_ids:
            return Response(
                {"code": "validation", "message": "At least one participant is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Создаём группу
        chat = Chat.objects.create(
            type='group',
            name=name,
            group_key_encrypted=group_key_encrypted
        )
        
        # Добавляем участников
        from users.models import User
        participants = list(User.objects.filter(id__in=participant_ids))
        participants.append(request.user)
        
        # Дедупликация
        participants = list(set(participants))
        
        chat.participants.set(participants)
        chat.save()
        
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
    
    @action(detail=False, methods=['post'])
    def read(self, request, chat_pk=None):
        """Пометить все сообщения как прочитанные"""
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

class UploadFileView(APIView):
    """
    Загрузка файла для чата
    POST /api/upload/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        if 'file' not in request.FILES:
            return Response(
                {"code": "validation", "message": "File is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        chat_id = request.data.get('chat_id')
        
        try:
            # Валидация
            validate_file(file)
            
            # Загрузка
            file_url = upload_file(file, request.user.id, chat_id)
            
            return Response({
                "url": file_url,
                "filename": file.name,
                "size": file.size,
                "type": file.content_type
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response(
                {"code": "validation", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
