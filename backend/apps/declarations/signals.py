from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.finances.models import Transaction

from .models import DeclarationJournaliere


@receiver(post_save, sender=Transaction)
def marquer_journee_declaree(sender, instance, created, **kwargs):
    """Toute transaction saisie vaut déclaration du jour pour son centre.

    Écrase une éventuelle déclaration « sans mouvement » : la présence d'un
    mouvement fait foi.
    """
    if not created:
        return
    DeclarationJournaliere.objects.update_or_create(
        centre=instance.centre,
        date=instance.date_operation,
        defaults={
            "statut": DeclarationJournaliere.Statut.DECLARE_AVEC_MOUVEMENT,
            "declare_par": instance.saisi_par,
        },
    )
