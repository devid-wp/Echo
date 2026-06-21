from django.shortcuts import render
from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from .models import User
from .serializers import UserSerializer

