from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Post, PostLike
from .serializers import PostSerializer


class FeedView(APIView):
    """
    GET  /api/feed   — list all posts (newest first)
    POST /api/feed/  — create a new post
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        posts = Post.objects.select_related('author').prefetch_related('post_likes').all()
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response({
            'items': serializer.data,
            'nextCursor': None,  # pagination not implemented yet
        })

    def post(self, request):
        body = request.data.get('body', '').strip()
        if not body:
            return Response(
                {'detail': 'body is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        post = Post.objects.create(author=request.user, body=body)
        serializer = PostSerializer(post, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostLikeView(APIView):
    """POST /api/feed/<id>/like/ — toggle like on a post."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response({'detail': 'post not found'}, status=status.HTTP_404_NOT_FOUND)

        like, created = PostLike.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True

        return Response({
            'liked': liked,
            'likes': post.post_likes.count(),
        })
