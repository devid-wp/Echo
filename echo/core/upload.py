import os
import uuid
from datetime import datetime
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings

def upload_file(file, user_id, chat_id=None):
    
    # Генерируем уникальное имя
    ext = os.path.splitext(file.name)[1]
    filename = f"{uuid.uuid4()}{ext}"
    
    # Путь: media/uploads/user_{user_id}/chat_{chat_id}/filename
    path = f"uploads/user_{user_id}"
    if chat_id:
        path = f"{path}/chat_{chat_id}"
    
    full_path = f"{path}/{filename}"
    
    # Сохраняем файл
    saved_path = default_storage.save(full_path, ContentFile(file.read()))
    
    # Возвращаем URL
    return f"{settings.MEDIA_URL}{saved_path}"

def validate_file(file):
    """
    Валидация файла
    """
    # Размер (макс 10MB)
    if file.size > 10 * 1024 * 1024:
        raise ValueError("Файл слишком большой (макс 10MB)")
    
    # Тип файла
    allowed_types = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',  # Изображения
        'application/pdf',  # PDF
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # Word
        'text/plain',  # Текст
        'application/zip', 'application/x-rar-compressed',  # Архивы
    ]
    
    if file.content_type not in allowed_types:
        raise ValueError(f"Неподдерживаемый тип файла: {file.content_type}")
    
    return True