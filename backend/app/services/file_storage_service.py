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

        last_error: Optional[Exception] = None
        for root in self._candidate_roots():
            try:
                absolute_path = self._resolve_path(relative_path, base_root=root)
                encrypted = absolute_path.read_bytes()
                return _cipher.decrypt(encrypted)
            except FileNotFoundError as exc:
                last_error = exc
                continue
            except ValueError as exc:
                last_error = exc
                continue

        if last_error:
            raise last_error
        raise FileNotFoundError("合同文件不存在")

    def delete(self, relative_path: str) -> None:
        """删除指定相对路径的合同文件。"""
        for root in self._candidate_roots():
            try:
                absolute_path = self._resolve_path(relative_path, base_root=root)
            except ValueError:
                continue
            if absolute_path.exists():
                absolute_path.unlink()
                break

    def exists(self, relative_path: str) -> bool:
        """判断合同文件是否存在。"""
        for root in self._candidate_roots():
            try:
                absolute_path = self._resolve_path(relative_path, base_root=root)
            except ValueError:
                continue
            if absolute_path.exists():
                return True
        return False

    def _candidate_roots(self) -> list[Path]:
        """生成可能的存储根路径列表，用于兼容不同环境。"""
        roots = [self._root]
        fallback_roots = [Path("/data/contracts"), Path("/app/storage/contracts"), Path("/app/storage")]

        for fallback in fallback_roots:
            try:
                resolved = fallback.resolve()
            except Exception:
                continue
            if resolved != self._root and resolved not in roots and resolved.exists():
                roots.append(resolved)

        return roots

    def _resolve_path(self, relative_path: str, *, base_root: Optional[Path] = None) -> Path:
        """根据相对路径解析文件绝对路径，防止目录穿越。"""
        base = base_root or self._root
        safe_relative = Path(relative_path)

        # 兼容旧数据：如果传入的是绝对路径或包含根目录名，转换为相对路径
        if safe_relative.is_absolute():
            try:
                safe_relative = safe_relative.relative_to(base)
            except ValueError:
                # 如果不能与当前 base 匹配，尝试其他 root
                for candidate in self._candidate_roots():
                    try:
                        safe_relative = safe_relative.relative_to(candidate)
                        base = candidate
                        break
                    except ValueError:
                        continue
                else:
                    raise ValueError("非法的合同文件路径")
        else:
            parts = safe_relative.parts
            if parts and parts[0] in {base.name, "contracts", "storage"}:
                safe_relative = Path(*parts[1:])

        normalized = (base / safe_relative).resolve()
        if not str(normalized).startswith(str(base)):
            raise ValueError("非法的合同文件路径")
        return normalized


file_storage_service = FileStorageService()


