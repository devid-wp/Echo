from rest_framework import serializers
from .models import Chat, Message
from users.serializers import UserSerializer
from users.models import User

# Сериализатор для сообщений
class MessageSerializer(serializers.ModelSerializer):
    # Имя отправителя
    sender_username = serializers.CharField(
        source='sender.username',
        read_only=True
    )
    
    # Аватар отправителя
    # sender_avatar = serializers.CharField(source='sender.avatar', read_only=True)
    
    sender_data = UserSerializer(
        source='sender',
        read_only=True
    )
    
    class Meta:
        model = Message
        fields = [
            'id',
            'chat',          # ID чата
            'sender',        # ID отправителя
            'sender_username',  # Имя отправителя (доп. поле)
            'sender_data',   # Полные данные отправителя (доп. поле)
            'text',
            'is_encrypted',
            'is_read',
            'read_at',
            'reply_to',
            'attachments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 
            'sender',        # Автоматически ставим текущего пользователя
            'is_read', 
            'read_at', 
            'created_at', 
            'updated_at'
        ]
    
    # Валидация сообщения
    def validate_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Сообщение не может быть пустым")
        
        if len(value) > 10000:
            raise serializers.ValidationError("Сообщение слишком длинное (макс. 10000 символов)")
        
        return value
    
    def validate(self, data):
        # Проверяем, что reply_to принадлежит этому же чату
        reply_to = data.get('reply_to')
        if reply_to:
            if reply_to.chat_id != data.get('chat').id:
                raise serializers.ValidationError(
                    "Нельзя ответить на сообщение из другого чата"
                )
        
        return data
    
    def create(self, validated_data):
        """
        Создание сообщения.
        Автоматически ставит отправителя.
        """
        # Если sender не передан возьмём из контекста
        if 'sender' not in validated_data:
            raise serializers.ValidationError("Отправитель обязателен")
        
        return super().create(validated_data)


class ChatSerializer(serializers.ModelSerializer):
    """
    Сериализатор для чатов.
    """
    
    # Полные данные участников
    participants_data = UserSerializer(
        source='participants',
        many=True,
        read_only=True
    )
    
    # Последнее сообщение
    last_message = serializers.SerializerMethodField()
    
    # Количество непрочитанных
    unread_count = serializers.SerializerMethodField()
    
    # Количество участников
    participants_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Chat
        fields = [
            'id',
            'type',
            'name',
            'participants',       # Массив ID участников
            'participants_data',  # Полные данные участников
            'participants_count', # Количество участников
            'last_message',       # Последнее сообщение
            'unread_count',       # Непрочитанные для текущего пользователя
            'created_at',
            'updated_at',
            'group_key_encrypted',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        """
        Получить последнее сообщение чата.
        obj — это объект Chat.
        """
        last = obj.get_last_message()
        if last:
            return MessageSerializer(last).data
        return None
    
    def get_unread_count(self, obj):
        """
        Получить количество непрочитанных для текущего пользователя.
        """
        # Получаем пользователя из контекста (передаём во view)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.get_unread_count(request.user)
        return 0
    
    def get_participants_count(self, obj):
        """
        Количество участников чата.
        """
        return obj.participants.count()
    
    def validate(self, data):
        """
        Проверка при создании/обновлении чата.
        """
        # Для личного чата проверяем, что ровно 2 участника
        if data.get('type') == 'private':
            participants = data.get('participants', [])
            if participants and len(participants) != 2:
                raise serializers.ValidationError(
                    "В личном чате должно быть ровно 2 участника"
                )
        
        return data
    
    def create(self, validated_data):
        """
        Создание чата.
        """
        # Извлекаем участников из данных
        participants = validated_data.pop('participants', [])
        
        # Создаём чат
        chat = Chat.objects.create(**validated_data)
        
        # Добавляем участников
        chat.participants.set(participants)
        
        return chat


class ChatDetailSerializer(ChatSerializer):
    """
    Расширенный сериализатор для детального просмотра чата.
    Включает все сообщения.
    """
    
    messages = MessageSerializer(
        source='messages',
        many=True,
        read_only=True
    )
    
    class Meta(ChatSerializer.Meta):
        fields = ChatSerializer.Meta.fields + ['messages']
