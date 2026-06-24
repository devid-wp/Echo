"""
Seed the development SQLite DB with a clean baseline for manual UI testing.

Creates 3 users (alice, bob, demo) and one demo chat with a welcome message.
Idempotent: re-running wipes the test users first so passwords stay canonical.
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "echo.settings")
django.setup()

from django.contrib.auth import get_user_model
from chats.models import Chat, Message
from feed.models import Post, PostLike

User = get_user_model()

TEST_HANDLES = ["alice", "bob", "demo"]
TEST_PASSWORD = "testpass123"

# Wipe previous test users + their chats so re-seeding is idempotent.
Chat.objects.filter(participants__username__in=TEST_HANDLES).delete()
User.objects.filter(username__in=TEST_HANDLES).delete()

users = {}
for handle in TEST_HANDLES:
    user = User.objects.create_user(
        username=handle,
        email=f"{handle}@echo.dev",
        password=TEST_PASSWORD,
        first_name=handle.capitalize(),
    )
    users[handle] = user
    print(f"  created user: {user.username} (id={user.id}, email={user.email})")

# Demo chat: alice <-> bob with a single welcome message.
chat = Chat.objects.create(type="private")
chat.participants.add(users["alice"], users["bob"])
Message.objects.create(
    chat=chat,
    sender=users["bob"],
    text="Hi Alice! Welcome to Echo.",
    is_encrypted=True,
)

# Clean up feed posts (already cascade-deleted but just to make sure)
Post.objects.all().delete()

# Seed posts
post1 = Post.objects.create(
    author=users["alice"],
    body="Hello world! This is my first post on Echo Feed. Decentralization rules! 🚀"
)
post2 = Post.objects.create(
    author=users["bob"],
    body="Hey Alice! Glad to be here. The split-screen chat design looks super premium!"
)
post3 = Post.objects.create(
    author=users["demo"],
    body="Testing the feed capability. Seems to be working flawlessly!"
)

# Likes
PostLike.objects.create(post=post1, user=users["bob"])
PostLike.objects.create(post=post1, user=users["demo"])
PostLike.objects.create(post=post2, user=users["alice"])

print("  seeded feed posts and likes")
print(f"  created chat id={chat.id} between alice & bob with 1 welcome message")
print()
print("=" * 60)
print("Test accounts (password for all: testpass123)")
print("=" * 60)
print("  alice@echo.dev   (id=%d)" % users["alice"].id)
print("  bob@echo.dev     (id=%d)" % users["bob"].id)
print("  demo@echo.dev    (id=%d)" % users["demo"].id)