"""
Direct backend test — bypasses HTTP so ALLOWED_HOSTS is irrelevant.
Tests RegisterView and LoginView logic by calling view functions directly.
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'echo.settings')
os.environ['DJANGO_ALLOW_ASYNC_UNSAFE'] = '1'
django.setup()

import json
from django.test.client import RequestFactory
from django.contrib.auth import get_user_model
from users.views import RegisterView, LoginView, MeView
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
factory = APIRequestFactory()

PASS = 'testpass999!'   # meets Django password validators

print('=' * 60)
print('BACKEND AUTH TESTS')
print('=' * 60)

# ─── TEST 1: Register new user ──────────────────────────────────
print('\n[1] REGISTER new user')
payload = {
    'handle': 'tester_diag',
    'displayName': 'Tester Diag',
    'email': 'tester_diag@echo.dev',
    'password': PASS,
}
# Clean up leftover from a previous run
User.objects.filter(username='tester_diag').delete()

req = factory.post('/api/auth/register/', json.dumps(payload), content_type='application/json')
view = RegisterView.as_view()
resp = view(req)
resp.accepted_renderer = None  # force DRF to render
print('  status:', resp.status_code)
data = resp.data
if resp.status_code == 201:
    print('  OK — token present:', 'token' in data)
    print('  user keys:', list(data.get('user', {}).keys()))
else:
    print('  FAIL —', data)

# ─── TEST 2: Login with email ───────────────────────────────────
print('\n[2] LOGIN with email (alice@echo.dev)')
req2 = factory.post('/api/auth/login/', json.dumps({
    'email': 'alice@echo.dev',
    'password': 'testpass123',
}), content_type='application/json')
view2 = LoginView.as_view()
resp2 = view2(req2)
print('  status:', resp2.status_code)
data2 = resp2.data
if resp2.status_code == 200:
    print('  OK — token present:', 'token' in data2)
    print('  user keys:', list(data2.get('user', {}).keys()))
    token = data2['token']
else:
    print('  FAIL —', data2)
    token = None

# ─── TEST 3: Login with username ────────────────────────────────
print('\n[3] LOGIN with username handle (alice)')
req3 = factory.post('/api/auth/login/', json.dumps({
    'email': 'alice',        # frontend sends this as 'email' field
    'password': 'testpass123',
}), content_type='application/json')
resp3 = LoginView.as_view()(req3)
print('  status:', resp3.status_code)
data3 = resp3.data
if resp3.status_code == 200:
    print('  OK — token present:', 'token' in data3)
else:
    print('  FAIL —', data3)

# ─── TEST 4: /api/users/me with token ───────────────────────────
print('\n[4] GET /api/users/me with valid token')
if token:
    req4 = factory.get('/api/users/me', HTTP_AUTHORIZATION='Bearer ' + token)
    from rest_framework_simplejwt.authentication import JWTAuthentication
    req4.META['HTTP_AUTHORIZATION'] = 'Bearer ' + token
    resp4 = MeView.as_view()(req4)
    print('  status:', resp4.status_code)
    if resp4.status_code == 200:
        print('  OK — user keys:', list(resp4.data.keys()))
    else:
        print('  FAIL —', resp4.data)

# ─── TEST 5: Wrong password ─────────────────────────────────────
print('\n[5] LOGIN wrong password → expect 401')
req5 = factory.post('/api/auth/login/', json.dumps({
    'email': 'alice@echo.dev',
    'password': 'wrongpassword',
}), content_type='application/json')
resp5 = LoginView.as_view()(req5)
print('  status:', resp5.status_code, '— expected 401')
print('  code:', resp5.data.get('code'))

# ─── TEST 6: Register duplicate email ───────────────────────────
print('\n[6] REGISTER with already-taken email → expect 409')
req6 = factory.post('/api/auth/register/', json.dumps({
    'handle': 'new_unique_handle_xyz',
    'displayName': 'Alice Dup',
    'email': 'alice@echo.dev',
    'password': PASS,
}), content_type='application/json')
resp6 = RegisterView.as_view()(req6)
print('  status:', resp6.status_code, '— expected 409')
print('  code:', resp6.data.get('code'))

# ─── TEST 7: Register duplicate handle ──────────────────────────
print('\n[7] REGISTER with already-taken handle → expect 409')
req7 = factory.post('/api/auth/register/', json.dumps({
    'handle': 'alice',
    'displayName': 'Alice Dup2',
    'email': 'totally_new@echo.dev',
    'password': PASS,
}), content_type='application/json')
resp7 = RegisterView.as_view()(req7)
print('  status:', resp7.status_code, '— expected 409')
print('  code:', resp7.data.get('code'))

# ─── TEST 8: Register missing fields ────────────────────────────
print('\n[8] REGISTER missing displayName → expect 400')
req8 = factory.post('/api/auth/register/', json.dumps({
    'handle': 'no_display',
    'email': 'no_display@echo.dev',
    'password': PASS,
}), content_type='application/json')
resp8 = RegisterView.as_view()(req8)
print('  status:', resp8.status_code, '— expected 400')
print('  code:', resp8.data.get('code'))

print()
print('=' * 60)
print('ALL TESTS DONE')
print('=' * 60)
