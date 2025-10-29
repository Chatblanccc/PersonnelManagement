import base64
import hashlib
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, Optional

from cryptography.fernet import Fernet

from app.config import settings

logger = logging.getLogger(__name__)


def _get_cipher() -> Fernet:
    """根据配置生成 Fernet 加密器。"""
    raw_key = settings.FILE_ENCRYPTION_KEY.encode()[:32]
    padded_key = raw_key.ljust(32, b"0")
    safe_key = base64.urlsafe_b64encode(padded_key)
    return Fernet(safe_key)


_cipher = _get_cipher()


@dataclass
class StoredContractFile:
    """已保存的合同文件元数据。"""

    file_id: str
    relative_path: str
    original_filename: str
    size: int
    checksum: str


class FileStorageService:
    """处理合同文件的本地加密存储。"""

    def __init__(self) -> None:
        self._root: Path = Path(settings.CONTRACT_STORAGE_DIR).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def _generate_storage_path(self, extension: str) -> tuple[Path, str]:
        """生成带日期分层的随机文件路径。"""
        today_prefix = Path(datetime.utcnow().strftime("%Y/%m/%d"))
        target_dir = self._root / today_prefix
        target_dir.mkdir(parents=True, exist_ok=True)

        file_id = uuid.uuid4().hex
        filename = f"{file_id}{extension}"
        relative_path = today_prefix / filename
        absolute_path = target_dir / filename
        return absolute_path, str(relative_path).replace("\\", "/")

    def save_encrypted(self, file_obj: BinaryIO, original_filename: str) -> StoredContractFile:
        """保存文件到本地加密目录，返回保存后的元数据。"""

        extension = Path(original_filename).suffix.lower()
        absolute_path, relative_path = self._generate_storage_path(extension)

        data = file_obj.read()
        checksum = hashlib.sha256(data).hexdigest()

        encrypted = _cipher.encrypt(data)

        absolute_path.write_bytes(encrypted)

        logger.info("合同文件已保存至加密目录", extra={
            "relative_path": relative_path,
            "size": len(data),
            "original_filename": original_filename,
        })

        return StoredContractFile(
            file_id=Path(relative_path).stem,
            relative_path=relative_path,
            original_filename=original_filename,
            size=len(data),
            checksum=checksum,
        )

    def load_decrypted(self, relative_path: str) -> bytes:
        """读取并解密指定相对路径的文件内容。"""
        absolute_path = self._resolve_path(relative_path)
        encrypted = absolute_path.read_bytes()
        return _cipher.decrypt(encrypted)

    def delete(self, relative_path: str) -> None:
        """删除指定相对路径的合同文件。"""
        absolute_path = self._resolve_path(relative_path)
        if absolute_path.exists():
            absolute_path.unlink()

    def exists(self, relative_path: str) -> bool:
        """判断合同文件是否存在。"""
        return self._resolve_path(relative_path).exists()

    def _resolve_path(self, relative_path: str) -> Path:
        """根据相对路径解析文件绝对路径，防止目录穿越。"""
        safe_relative = Path(relative_path)
        normalized = (self._root / safe_relative).resolve()
        if not str(normalized).startswith(str(self._root)):
            raise ValueError("非法的合同文件路径")
        return normalized


file_storage_service = FileStorageService()


