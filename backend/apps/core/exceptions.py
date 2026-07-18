from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Format d'erreur uniforme : {detail, code, fields?}.

    - detail : message lisible pour l'utilisateur
    - code : identifiant machine (ex: "validation_error", "permission_denied")
    - fields : présent uniquement pour les erreurs de validation par champ
    """
    response = exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    if isinstance(data, dict) and "detail" in data and len(data) <= 2:
        detail = data["detail"]
        code = getattr(detail, "code", None) or data.get("code", "error")
        response.data = {"detail": str(detail), "code": str(code)}
    elif isinstance(data, dict | list):
        response.data = {
            "detail": "Certains champs sont invalides.",
            "code": "validation_error",
            "fields": data,
        }
    return response
