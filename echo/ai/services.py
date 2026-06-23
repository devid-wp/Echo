import requests
import json
from django.conf import settings


class DeepSeekService:
    """Сервис для работы с DeepSeek API"""
    
    BASE_URL = settings.DEEPSEEK_API_URL
    API_KEY = settings.DEEPSEEK_API_KEY
    MODEL = settings.DEEPSEEK_MODEL
    
    @classmethod
    def _call_api(cls, messages, temperature=0.7, max_tokens=200):
        """
        Вызов DeepSeek API
        """
        if not cls.API_KEY:
            print("⚠️ DeepSeek API key not configured")
            return None
        
        headers = {
            'Authorization': f'Bearer {cls.API_KEY}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': cls.MODEL,
            'messages': messages,
            'temperature': temperature,
            'max_tokens': max_tokens
        }
        
        try:
            response = requests.post(
                f"{cls.BASE_URL}/chat/completions",
                headers=headers,
                json=data,
                timeout=15
            )
            response.raise_for_status()
            result = response.json()
            
            if 'choices' in result and len(result['choices']) > 0:
                return result['choices'][0]['message']['content'].strip()
            else:
                print(f"⚠️ Unexpected response format: {result}")
                return None
                
        except requests.exceptions.Timeout:
            print("❌ DeepSeek API timeout")
            return None
        except requests.exceptions.RequestException as e:
            print(f"❌ DeepSeek API error: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Response: {e.response.text}")
            return None
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return None
    
    @classmethod
    def generate_reply(cls, message, context=None, user_name=None):
        """
        Генерация умного ответа на сообщение
        """
        system_prompt = """
        Ты дружелюбный ассистент в чате. 
        Отвечай коротко, естественно и по существу.
        Твой ответ должен быть максимум 2-3 предложения.
        Используй смайлики когда уместно.
        """
        
        user_message = f"""
        Ответь на сообщение в чате.
        
        {'Контекст диалога: ' + context if context else ''}
        
        Сообщение от {'пользователя ' + user_name if user_name else 'пользователя'}: {message}
        
        Твой ответ (короткий и дружелюбный):
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        return cls._call_api(messages, temperature=0.8, max_tokens=100)
    
    @classmethod
    def moderate_content(cls, text):
        """
        Проверка контента на токсичность/спам
        Возвращает: (is_safe, score, reason)
        """
        system_prompt = """
        Ты модератор контента. Проверяй текст на:
        - Оскорбления и личные нападки
        - Спам и рекламу
        - Нецензурную лексику
        - Угрозы
        - Дискриминацию
        - Мошенничество
        
        Отвечай строго в формате JSON:
        {"is_safe": true/false, "score": 0-100, "reason": "причина если не безопасно"}
        """
        
        user_message = f"""
        Проверь текст на нарушения:
        Текст: {text}
        
        Ответь JSON:
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        response = cls._call_api(messages, temperature=0.2, max_tokens=100)
        
        if response:
            try:
                import re
                json_match = re.search(r'\{[^}]+\}', response)
                if json_match:
                    result = json.loads(json_match.group())
                    return (
                        result.get('is_safe', True),
                        result.get('score', 100),
                        result.get('reason', '')
                    )
            except:
                pass
        
        # Если не удалось распарсить - считаем безопасным
        return True, 100, ''
    
    @classmethod
    def summarize_chat(cls, messages):
        """
        Суммаризация чата
        """
        system_prompt = """
        Ты ассистент, который составляет краткие саммари диалогов.
        Выдели основные темы и ключевые моменты.
        Ответ должен быть 3-5 предложений.
        """
        
        # Ограничиваем длину
        if len(messages) > 2000:
            messages = messages[:2000] + "..."
        
        user_message = f"""
        Сделай краткое содержание диалога:
        
        {messages}
        
        Саммари (кратко и по существу):
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        return cls._call_api(messages, temperature=0.5, max_tokens=150)
    
    @classmethod
    def generate_chat_title(cls, messages):
        """
        Генерация названия для чата
        """
        system_prompt = """
        Ты ассистент, который придумывает короткие и понятные названия для чатов.
        Название должно быть 2-4 слова.
        """
        
        user_message = f"""
        Придумай название для чата с этими сообщениями:
        {messages[:500]}
        
        Название (2-4 слова):
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        return cls._call_api(messages, temperature=0.7, max_tokens=30)
    
    @classmethod
    def generate_sticker_suggestion(cls, text):
        """
        Предложение стикера/эмодзи по тексту
        """
        system_prompt = """
        Ты ассистент, который предлагает подходящий стикер или эмодзи к сообщению.
        Ответь одним или двумя эмодзи.
        """
        
        user_message = f"""
        Какое эмодзи подходит к этому сообщению?
        Сообщение: {text}
        
        Эмодзи (только эмодзи, без текста):
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        return cls._call_api(messages, temperature=0.9, max_tokens=10)
    
    @classmethod
    def translate_message(cls, text, target_language='russian'):
        """
        Перевод сообщения
        """
        system_prompt = f"""
        Ты переводчик. Переведи сообщение на {target_language}.
        Ответь только переводом, без пояснений.
        """
        
        user_message = f"""
        Переведи на {target_language}:
        {text}
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        return cls._call_api(messages, temperature=0.3, max_tokens=200)


# Для совместимости со старым кодом (если использовался OpenCode Zen)
OpenCodeZenService = DeepSeekService