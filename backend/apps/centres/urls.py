from rest_framework.routers import DefaultRouter

from .views import CentreViewSet, TypeCentreViewSet

router = DefaultRouter()
router.register("centres", CentreViewSet, basename="centre")
router.register("types-centres", TypeCentreViewSet, basename="type-centre")

urlpatterns = router.urls
