from rest_framework import serializers


class PostAuthorSerializer(serializers.Serializer):
    """Nested author object matching the frontend Post.author shape."""
    id = serializers.SerializerMethodField()
    handle = serializers.CharField(source='username')
    displayName = serializers.SerializerMethodField()

    def get_id(self, obj):
        return str(obj.id)

    def get_displayName(self, obj):
        return obj.first_name or obj.username


class PostSerializer(serializers.Serializer):
    """Serializes a Post model to the frontend Post shape (camelCase)."""
    id = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    body = serializers.CharField()
    createdAt = serializers.SerializerMethodField()
    likes = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    likedByMe = serializers.SerializerMethodField()

    def get_id(self, obj):
        return str(obj.id)

    def get_author(self, obj):
        return PostAuthorSerializer(obj.author).data

    def get_createdAt(self, obj):
        return obj.created_at.isoformat()

    def get_likes(self, obj):
        return obj.post_likes.count()

    def get_comments(self, _obj):
        return 0  # comments not implemented yet

    def get_likedByMe(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.post_likes.filter(user=request.user).exists()
