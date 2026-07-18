from rest_framework.routers import DefaultRouter

from .views import DeclarationViewSet

router = DefaultRouter()
router.register("declarations", DeclarationViewSet, basename="declaration")

urlpatterns = router.urls
