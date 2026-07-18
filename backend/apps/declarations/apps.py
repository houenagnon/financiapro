from django.apps import AppConfig


class DeclarationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.declarations"
    label = "declarations"

    def ready(self):
        from . import signals  # noqa: F401
