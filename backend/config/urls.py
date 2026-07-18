from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.centres.urls")),
    path("api/", include("apps.finances.urls")),
    path("api/", include("apps.declarations.urls")),
    path("api/", include("apps.reports.urls")),
]
