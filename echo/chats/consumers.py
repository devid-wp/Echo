import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.db.models import Q
from users.models import User


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        self.user = self.scope['user']
        self.room_group_name = f'chat_{self.chat_id}'
        
        # Проверяем авторизацию
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Проверяем, что пользователь участник чата
        if not await self.is_participant():
            await self.close()
            return
        
        # Добавляем в группу
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Отправляем историю сообщений при подключении
        messages = await self.get_chat_history()
        await self.send(text_data=json.dumps({
            'type': 'chat_history',
            'messages': messages
        }))
    
    async def disconnect(self, close_code):
        # Удаляем из группы
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'message':
            # Сохраняем сообщение
            message = await self.save_message(data.get('text'))
            
            # Отправляем всем в группе
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message
                }
            )
        
        elif message_type == 'typing':
            # Отправляем статус печатания
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user': self.user.id,
                    'is_typing': data.get('is_typing', False)
                }
            )
        
        elif message_type == 'read':
            # Помечаем сообщения как прочитанные
            await self.mark_as_read(data.get('message_id'))
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_read',
                    'message_id': data.get('message_id'),
                    'user_id': self.user.id
                }
            )
    
    async def chat_message(self, event):
        """Отправка сообщения клиенту"""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))
    
    async def typing_indicator(self, event):
        """Отправка статуса печатания"""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user'],
            'is_typing': event['is_typing']
        }))
    
    async def message_read(self, event):
        """Отправка статуса прочтения"""
        await self.send(text_data=json.dumps({
            'type': 'read',
            'message_id': event['message_id'],
            'user_id': event['user_id']
        }))
    
    @database_sync_to_async
    def is_participant(self):
        """Проверка, что пользователь участник чата"""
        from .models import Chat
        return Chat.objects.filter(
            id=self.chat_id,
            participants=self.user
        ).exists()
    
    @database_sync_to_async
    def get_chat_history(self):
        """Получение истории сообщений"""
        from .models import Message
        from .serializers import MessageSerializer

        messages = Message.objects.filter(
            chat_id=self.chat_id
        ).order_by('-created_at')[:50]
        
        # Сериализуем сообщения
        serializer = MessageSerializer(messages, many=True, context={'request': None})
        return serializer.data
    
    @database_sync_to_async
    def save_message(self, text):
        """Сохранение сообщения"""
        from .models import Chat, Message
        from .serializers import MessageSerializer
        chat = Chat.objects.get(id=self.chat_id)
        message = Message.objects.create(
            chat=chat,
            sender=self.user,
            text=text,
            is_encrypted=False
        )
        
        # Сериализуем для отправки
        serializer = MessageSerializer(message, context={'request': None})
        return serializer.data
    
    @database_sync_to_async
    def mark_as_read(self, message_id):
        """Пометить сообщение как прочитанное"""
        from .models import Chat, Message
        try:
            message = Message.objects.get(id=message_id, chat_id=self.chat_id)
            if message.sender != self.user:
                message.is_read = True
                message.save()
        except Message.DoesNotExist:
            pass