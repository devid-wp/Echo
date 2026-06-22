from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def api_exception_handler(exc, context):
    """Кастомный обработчик ошибок для фронта"""
    response = exception_handler(exc, context)
    
    if response is not None:
        # Преобразуем ошибки в формат фронта
        code = 'validation'
        message = 'Validation error'
        
        if response.status_code == 401:
            code = 'unauthorized'
            message = 'Authentication required'
        elif response.status_code == 403:
            code = 'forbidden'
            message = 'Permission denied'
        elif response.status_code == 404:
            code = 'not_found'
            message = 'Resource not found'
        
        return Response({
            'code': code,
            'message': message,
            'details': response.data
        }, status=response.status_code)
    
    return response