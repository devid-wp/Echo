from django.db import models
from django.conf import settings
from django.utils import timezone

class Chat(models.Model):

    TYPE_CHOICES = (
        ("private", "Личный чат"),
        ("group", "Групповой чат")
    )
    type = models.CharField(choices=TYPE_CHOICES, default="private")
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="chats",
        verbose_name="Участники чата"
    )

    # МЕТАДАННЫЕ ГРУППЫ
    name = models.CharField(max_length=100, blank=True, null=True, verbose_name="Название группы")
    created_at = models.DateTimeField(auto_now_add=True) # Когда создали чат
    updated_at = models.DateTimeField(auto_now=True) 
    # Безопасность группы(когда ее буду делать)
    group_key_encrypted = models.TextField(blank=True, null=True, verbose_name="Зашифрованный групповой ключ")

    class Meta:
        ordering = ["-updated_at"]

    # Дальше идут функции для получения последнего сообщения и для счетчика непрочитанных
    # Получаем счетчик через фильтрацию и SQL запрос к бд
    def get_last_message(self):
        return self.messages.last()
    
    def get_unread_count(self, user):
        return self.messages.filter(is_read=False).exclude(sender=user).count()
    
    def __str__(self):
        if self.name:
            return self.name
        return f"Chat: {self.id}"

class Message(models.Model):
    # Чат
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    # Отправитель
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    # Ответить кому
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name="Ответ на сообщение"
    )

    # Файлы
    attachments = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Вложения(массив url)"
    )

    # Содержание сообщения
    text = models.TextField(verbose_name="Текст сообщения")
    # Снова шифрование НА ПОТОМ
    is_encrypted = models.BooleanField(default=True, verbose_name="Зашифровано?")

    # Статусы ЛИМБУС КОМПАНИИ
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True) # Когда прочитано
    is_deleated = models.BooleanField(default=False) # Тут слабое удаление, потому что я еблан
    deleated_at = models.DateTimeField(null=True, blank=True) # Когда удаленно

    # Снова метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.username}: {self.text[:30]}..."
    
    # Пометить прочитаным(как в уведах тг)
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
