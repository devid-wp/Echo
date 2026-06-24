from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSerializer, UserUpdateSerializer


class UploadAvatarView(APIView):
    """
    Загрузка аватара пользователя.
    POST /api/users/me/avatar/
    DELETE /api/users/me/avatar/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response(
                {"code": "validation", "message": "Avatar file is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        avatar_file = request.FILES['avatar']
        
        # Валидация размера (5MB)
        if avatar_file.size > 5 * 1024 * 1024:
            return Response(
                {"code": "validation", "message": "Avatar too large (max 5MB)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Валидация типа
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if avatar_file.content_type not in allowed_types:
            return Response(
                {"code": "validation", "message": "Invalid image format"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        user.avatar = avatar_file
        user.save()
        
        return Response({
            "avatar": request.build_absolute_uri(user.avatar.url)
        }, status=status.HTTP_200_OK)
    
    def delete(self, request):
        user = request.user
        if user.avatar:
            user.avatar.delete(save=False)
            user.avatar = None
            user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegisterView(generics.CreateAPIView):
    """
    Регистрация пользователя.
    POST /api/auth/register/
    Тело: { handle, displayName, email, password }
    Ответ: { token, user }
    """
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        handle = request.data.get('handle')
        if not handle:
            return Response(
                {"code": "validation", "message": "Handle is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(username=handle).exists():
            return Response(
                {"code": "handle_taken", "message": "Handle already taken"},
                status=status.HTTP_409_CONFLICT
            )
        
        display_name = request.data.get('displayName')
        if not display_name:
            return Response(
                {"code": "validation", "message": "Display name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем email
        email = request.data.get('email')
        if not email:
            return Response(
                {"code": "validation", "message": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(email=email).exists():
            return Response(
                {"code": "email_taken", "message": "Email already taken"},
                status=status.HTTP_409_CONFLICT
            )
        
        # Проверяем пароль
        password = request.data.get('password')
        if not password or len(password) < 8:
            return Response(
                {"code": "validation", "message": "Password must be at least 8 characters"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Создаём пользователя
        user = User.objects.create_user(
            username=handle,
            email=email,
            password=password,
            first_name=display_name
        )

        # Генерируем JWT
        refresh = RefreshToken.for_user(user)
        
        from .serializers import UserSerializer as UserOutSerializer
        return Response({
            "token": str(refresh.access_token),
            "user": UserOutSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    """
    Логин пользователя.
    POST /api/auth/login/
    Тело: { email, password }
    Ответ: { token, user }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')

        if not identifier or not password:
            return Response(
                {"code": "validation", "message": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Accept either an email OR a username as the identifier. Email lookup
        # is case-insensitive so "Alice@echo.dev" and "alice@echo.dev" both work.
        user = User.objects.filter(email__iexact=identifier).first()
        if user is None:
            user = User.objects.filter(username__iexact=identifier).first()
        if user is None:
            return Response(
                {"code": "invalid_credentials", "message": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user_auth = authenticate(username=user.username, password=password)
        if user_auth is None:
            return Response(
                {"code": "invalid_credentials", "message": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        
        from .serializers import UserSerializer as UserOutSerializer
        return Response({
            "token": str(refresh.access_token),
            "user": UserOutSerializer(user).data
        })


class MeView(generics.RetrieveUpdateAPIView):
    """
    Текущий пользователь.
    GET /api/users/me
    PATCH /api/users/me
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            from .serializers import UserSerializer
            return UserSerializer
        else:
            from .serializers import UserUpdateSerializer
            return UserUpdateSerializer
    
    def update(self, request, *args, **kwargs):
        # ✅ Поддерживаем displayName вместо first_name
        if 'displayName' in request.data:
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
                request.data['first_name'] = request.data.pop('displayName')
                request.data._mutable = False
            else:
                request.data['first_name'] = request.data.pop('displayName')
        
        return super().update(request, *args, **kwargs)
    

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)

class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"code": "not_found", "message": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)


class UserListView(generics.ListAPIView):
    """
    Список пользователей (исключая текущего) для создания групп.
    GET /api/users
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.exclude(id=self.request.user.id)
