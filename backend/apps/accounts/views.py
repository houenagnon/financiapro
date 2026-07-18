from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .permissions import CanManageUsers
from .serializers import UserCreateSerializer, UserSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response(
                {"detail": "Le refresh token est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            RefreshToken(refresh).blacklist()
        except Exception:
            return Response(
                {"detail": "Token invalide ou déjà révoqué."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageUsers]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ECONOMAT_CENTRAL:
            return User.objects.all()
        if user.centre_id is None:
            return User.objects.filter(pk=user.pk)
        return User.objects.filter(centre_id=user.centre_id)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        target = self.get_object()
        if target == request.user:
            return Response(
                {"detail": "Impossible de désactiver son propre compte."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target.is_active = False
        target.save(update_fields=["is_active"])
        return Response(UserSerializer(target).data)
