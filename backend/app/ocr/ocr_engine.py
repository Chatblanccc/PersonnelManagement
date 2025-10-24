import logging
import os
from typing import List, Tuple

from app.config import settings

logger = logging.getLogger(__name__)


class BaseOCREngine:
    """OCR 引擎抽象基类"""

    enabled: bool = True

    def process_image(self, image_path: str) -> List[Tuple[str, float]]:
        raise NotImplementedError

    def process_pdf(self, pdf_path: str) -> List[Tuple[str, float]]:
        raise NotImplementedError

    def process_file(self, file_path: str) -> List[Tuple[str, float]]:
        raise NotImplementedError

    def get_full_text(self, text_lines: List[Tuple[str, float]]) -> str:
        return '\n'.join([text for text, _ in text_lines])


class PaddleOCREngine(BaseOCREngine):
    """基于 PaddleOCR 的引擎实现"""

    def __init__(self):
        # 为避免导入 paddleocr 失败阻塞应用，这里延迟导入
        from paddleocr import PaddleOCR
        import pdf2image

        self.PaddleOCR = PaddleOCR
        self.pdf2image = pdf2image
        self.device = "gpu:0" if settings.OCR_USE_GPU else "cpu"
        self._ocr = None
        self._init_error: Exception | None = None

    def _ensure_ocr_initialized(self) -> bool:
        if self._ocr is not None:
            return True

        if self._init_error is not None:
            logger.warning("PaddleOCR 初始化失败，OCR 功能不可用: %s", self._init_error)
            return False

        try:
            self._ocr = self.PaddleOCR(
                use_angle_cls=True,
                lang="ch",
                device=self.device,
                show_log=False,
            )
            logger.info("PaddleOCR 初始化成功，device=%s", self.device)
            return True
        except Exception as exc:
            self._init_error = exc
            logger.exception("PaddleOCR 初始化失败，已禁用 OCR 功能: %s", exc)
            return False

    def process_image(self, image_path: str) -> List[Tuple[str, float]]:
        if not self._ensure_ocr_initialized():
            logger.error("PaddleOCR 未初始化成功，无法处理图片 %s", image_path)
            return []

        try:
            result = self._ocr.ocr(image_path, cls=True)

            if not result or not result[0]:
                return []

            text_lines: List[Tuple[str, float]] = []
            for line in result[0]:
                text = line[1][0]
                confidence = line[1][1]
                text_lines.append((text, confidence))

            return text_lines
        except Exception as exc:
            logger.exception("OCR 处理图片失败: %s", exc)
            return []

    def process_pdf(self, pdf_path: str) -> List[Tuple[str, float]]:
        if not self._ensure_ocr_initialized():
            logger.error("PaddleOCR 未初始化成功，无法处理 PDF %s", pdf_path)
            return []

        try:
            images = self.pdf2image.convert_from_path(pdf_path)

            all_text_lines: List[Tuple[str, float]] = []
            for idx, image in enumerate(images):
                temp_image_path = f"temp_page_{idx}.jpg"
                image.save(temp_image_path, "JPEG")

                text_lines = self.process_image(temp_image_path)
                all_text_lines.extend(text_lines)

                os.remove(temp_image_path)

            return all_text_lines
        except Exception as exc:
            logger.exception("OCR 处理 PDF 失败: %s", exc)
            return []

    def process_file(self, file_path: str) -> List[Tuple[str, float]]:
        file_ext = os.path.splitext(file_path)[1].lower()

        if file_ext == ".pdf":
            return self.process_pdf(file_path)
        if file_ext in [".jpg", ".jpeg", ".png", ".bmp"]:
            return self.process_image(file_path)
        raise ValueError(f"Unsupported file type: {file_ext}")


class DummyOCREngine(BaseOCREngine):
    """占位 OCR 引擎，实现空操作"""

    enabled = False

    def process_image(self, image_path: str) -> List[Tuple[str, float]]:
        logger.info("OCR 已禁用，跳过图片识别: %s", image_path)
        return []

    def process_pdf(self, pdf_path: str) -> List[Tuple[str, float]]:
        logger.info("OCR 已禁用，跳过 PDF 识别: %s", pdf_path)
        return []

    def process_file(self, file_path: str) -> List[Tuple[str, float]]:
        logger.info("OCR 已禁用，直接返回空结果: %s", file_path)
        return []


def create_ocr_engine() -> BaseOCREngine:
    if not settings.OCR_ENABLED:
        logger.warning("OCR 功能已在配置中禁用，使用 DummyOCREngine")
        return DummyOCREngine()

    try:
        engine = PaddleOCREngine()
        logger.info("使用 PaddleOCR 引擎")
        return engine
    except Exception as exc:
        logger.exception("初始化 PaddleOCR 引擎失败，降级为 DummyOCREngine: %s", exc)
        return DummyOCREngine()


# 创建全局 OCR 引擎实例
ocr_engine: BaseOCREngine = create_ocr_engine()

