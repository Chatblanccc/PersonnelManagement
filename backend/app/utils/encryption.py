from cryptography.fernet import Fernet
from app.config import settings
import base64

# 创建加密器
# 注意：ENCRYPTION_KEY 必须是 32 字节长的 base64 编码字符串
def get_cipher():
    # 确保密钥是 32 字节
    key = settings.ENCRYPTION_KEY.encode()[:32]
    # 补齐到 32 字节
    key = key.ljust(32, b'0')
    # Base64 编码
    key_b64 = base64.urlsafe_b64encode(key)
    return Fernet(key_b64)

cipher = get_cipher()

def encrypt_field(value: str) -> str:
    """加密敏感字段"""
    if not value:
        return ""
    try:
        encrypted = cipher.encrypt(value.encode())
        return encrypted.decode()
    except Exception as e:
        print(f"Encryption error: {e}")
        return value

def decrypt_field(encrypted_value: str) -> str:
    """解密敏感字段"""
    if not encrypted_value:
        return ""
    try:
        decrypted = cipher.decrypt(encrypted_value.encode())
        return decrypted.decode()
    except Exception as e:
        print(f"Decryption error: {e}")
        return encrypted_value

# 需要加密的字段列表
SENSITIVE_FIELDS = ['id_number', 'phone_number', 'address', 'emergency_phone']

