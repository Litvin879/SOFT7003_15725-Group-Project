"""Firebase Admin SDK / Firestore connection."""
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore


def get_firestore_client():
    """Return a Firestore client, initializing Firebase Admin only once."""
    if firebase_admin._apps:
        return firestore.client()

    credential_path = Path(
        os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json")
    )
    if not credential_path.is_absolute():
        credential_path = Path.cwd() / credential_path

    if not credential_path.is_file():
        raise FileNotFoundError(
            f"Firebase service account file not found: {credential_path}. "
            "Place firebase-service-account.json in the project root or set "
            "FIREBASE_CREDENTIALS_PATH."
        )

    cred = credentials.Certificate(str(credential_path))
    firebase_admin.initialize_app(cred)
    return firestore.client()
