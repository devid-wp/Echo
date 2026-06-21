from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


# Сериализатор пользователя(очень хочу эту штуку юзать)
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True, 
        validators=[validate_password], 
        style={'input_type': 'password'}
    )

    password2 = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'}
    )

    age = serializers.IntegerField(read_only=True)

    # Метаданные
    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'email', 
            'password', 
            'password2',
            'public_key', 
            'online_status', 
            'last_seen',
            'age',
            'bio',
            'birth_date',
        ]
        # Какие поля можно только читать
        read_only_fields = ['id', 'online_status', 'last_seen', 'age']
        # Какие поля обязательны
        extra_kwargs = {
            'email': {'required': False},
            'public_key': {'required': False},
            'bio': {'required': False},
            'birth_date': {'required': False},
        }
    
    # Валидация ДР
    def validate_birth_date(self, value):
        if value:
            from datetime import date
            if value > date.today():
                raise serializers.ValidationError("Дата рождения не может быть в будущем")
            
            age = date.today().year - value.year
            if age > 150:
                raise serializers.ValidationError("Некорректная дата рождения")
        return value

    # Валидация БИО
    def validate_bio(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Bio не может быть длиннее 500 символов")
        return value

    # Валидация
    def validate(self, data):
        # Проверяем, что пароли совпадают
        password = data.get('password')
        password2 = data.pop('password2', None)
        
        if password2 and password != password2:
            raise serializers.ValidationError(
                {"password": "Пароли не совпадают"}
            )
        
        return data
    
    def create(self, validated_data):
        """
        Создание пользователя.
        Вызывается при serializer.save()
        """
        # Убираем пароль из validated_data, чтобы не сохранять в открытом виде
        password = validated_data.pop('password')
        
        # Создаём пользователя
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Обновляем обычные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Хэш пароля
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance

# Сериализатор для ключа
class UserPublicKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['public_key']
    
    # Снова валидация
    def validate_public_key(self, value):
        if not value:
            raise serializers.ValidationError("Публичный ключ не может быть пустым")
        
        # Простая проверка на формат PEM
        if not value.startswith('-----BEGIN') or not value.endswith('-----END PUBLIC KEY-----'):
            raise serializers.ValidationError("Неверный формат публичного ключа")
        
        return value

# Сериализатор для устройства пользователя
class UserDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import UserDevice
        model = UserDevice
        fields = ['id', 'device_id', 'public_key', 'user_agent', 'last_active', 'is_active']
        read_only_fields = ['id', 'last_active']
