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
post4 = Post.objects.create(
    author=users["alice"],
    body="[SYSTEM EVENT] Initialized local DHT routing table. Connected to 12 active bootstrap peers."
)
post5 = Post.objects.create(
    author=users["bob"],
    body="commit: 4a2f8b1 - feat: implement end-to-end encryption handshake using Curve25519"
)
post6 = Post.objects.create(
    author=users["demo"],
    body="[NODE METRICS] Cpu utilization: 4.2% | Memory: 154MB/2048MB | Active WebSocket channels: 42"
)
post7 = Post.objects.create(
    author=users["alice"],
    body="Who's up for a quick voice/video calls hackathon next weekend? Let's add WebRTC support!"
)
post8 = Post.objects.create(
    author=users["bob"],
    body="Highly recommend switching your client theme to 'Monokai Terminal' for maximum immersion."
)
post9 = Post.objects.create(
    author=users["demo"],
    body="[SECURITY REPORT] Blocked 17 unauthorized login attempts targeting user @root. No key compromises detected."
)
post10 = Post.objects.create(
    author=users["alice"],
    body="Just deployed a new IPFS pinning service node to persist chat attachments in a decentralized manner."
)
post11 = Post.objects.create(
    author=users["bob"],
    body="commit: c1db27e - feat: integrate feed backend app, run migrations, and seed initial feed posts"
)
post12 = Post.objects.create(
    author=users["demo"],
    body="[AI SUBSYSTEM] DeepSeek-R1 agent connected successfully. Ready to answer smart replies at /chats."
)
post13 = Post.objects.create(
    author=users["alice"],
    body="Status update: We have officially crossed 1,000 decentralized nodes in the Echo network! 🌐"
)
post14 = Post.objects.create(
    author=users["bob"],
    body="Cleaned up the CSS layout. No more double scrollbars or overflow issues. Thanks for the heads up!"
)
post15 = Post.objects.create(
    author=users["demo"],
    body="[WEATHER STATION] Local temperature: 22°C | Status: Partly Cloudy | Location: Server Room #4"
)
post16 = Post.objects.create(
    author=users["alice"],
    body="Friendly reminder: back up your private keys! Echo does not store them, so if you lose them, you lose access to your encrypted messages forever."
)

# Likes
PostLike.objects.create(post=post1, user=users["bob"])
PostLike.objects.create(post=post1, user=users["demo"])
PostLike.objects.create(post=post2, user=users["alice"])
PostLike.objects.create(post=post4, user=users["bob"])
PostLike.objects.create(post=post6, user=users["alice"])
PostLike.objects.create(post=post7, user=users["bob"])
PostLike.objects.create(post=post7, user=users["demo"])
PostLike.objects.create(post=post9, user=users["alice"])
PostLike.objects.create(post=post11, user=users["alice"])
PostLike.objects.create(post=post13, user=users["bob"])
PostLike.objects.create(post=post13, user=users["demo"])
PostLike.objects.create(post=post16, user=users["bob"])

print("  seeded feed posts and likes")
print(f"  created chat id={chat.id} between alice & bob with 1 welcome message")
print()
print("=" * 60)
print("Test accounts (password for all: testpass123)")
print("=" * 60)
print("  alice@echo.dev   (id=%d)" % users["alice"].id)
print("  bob@echo.dev     (id=%d)" % users["bob"].id)
print("  demo@echo.dev    (id=%d)" % users["demo"].id)