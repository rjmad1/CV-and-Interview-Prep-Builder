import os

from cryptography.fernet import Fernet

from apps.api.src.config import settings


def _get_fernet() -> Fernet:
    """Returns a Fernet cipher using the configured vault encryption key."""
    key = settings.VAULT_ENCRYPTION_KEY
    if not key:
        raise RuntimeError("VAULT_ENCRYPTION_KEY is not configured.")
    return Fernet(key.encode())


def write_vault_file(path: str, data: bytes, encrypt: bool = False) -> None:
    """Writes bytes to a file path, optionally encrypting with Fernet."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if encrypt:
        data = _get_fernet().encrypt(data)
    with open(path, "wb") as f_out:
        f_out.write(data)


def read_vault_file(path: str, decrypt: bool = False) -> bytes:
    """Reads bytes from a file path, optionally decrypting with Fernet."""
    with open(path, "rb") as f_in:
        data = f_in.read()
    if decrypt:
        data = _get_fernet().decrypt(data)
    return data
