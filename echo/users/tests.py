from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User

class AuthTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.login_url = reverse('login')
    
    def test_register_success(self):
        data = {
            'handle': 'testuser',
            'displayName': 'Test User',
            'email': 'test@example.com',
            'password': 'securepass123'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue('token' in response.data)
        self.assertEqual(response.data['user']['handle'], 'testuser')
    
    def test_register_duplicate_handle(self):
        User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='pass123'
        )
        data = {
            'handle': 'testuser',
            'displayName': 'Test User',
            'email': 'new@example.com',
            'password': 'securepass123'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data['code'], 'handle_taken')
    
    def test_login_success(self):
        User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='securepass123'
        )
        data = {
            'email': 'test@example.com',
            'password': 'securepass123'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('token' in response.data)