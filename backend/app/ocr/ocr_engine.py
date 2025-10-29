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
        logger.info("[OCR] 检查 PaddleOCR 初始化状态...")
        
        if self._ocr is not None:
            logger.info("[OCR] PaddleOCR 已初始化，直接使用")
            return True

        if self._init_error is not None:
            logger.warning("[OCR] PaddleOCR 之前初始化失败，OCR 功能不可用: %s", self._init_error)
            return False

        logger.info("[OCR] 开始初始化 PaddleOCR (device=%s)...", self.device)
        try:
            # 新版 PaddleOCR 使用 use_textline_orientation 替代 use_angle_cls
            try:
                self._ocr = self.PaddleOCR(
                    use_textline_orientation=True,
                    lang="ch",
                    device=self.device,
                )
            except TypeError:
                # 兼容旧版本
                logger.warning("[OCR] 尝试使用旧版 API (use_angle_cls)")
                self._ocr = self.PaddleOCR(
                    use_angle_cls=True,
                    lang="ch",
                    device=self.device,
                )
            logger.info("[OCR] *** PaddleOCR 初始化成功! device=%s ***", self.device)
            return True
        except Exception as exc:
            self._init_error = exc
            logger.exception("[OCR] PaddleOCR 初始化失败，已禁用 OCR 功能: %s", exc)
            return False

    def process_image(self, image_path: str) -> List[Tuple[str, float]]:
        logger.info("[OCR] 开始处理图片: %s", image_path)
        
        if not self._ensure_ocr_initialized():
            logger.error("[OCR] PaddleOCR 未初始化成功，无法处理图片 %s", image_path)
            return []

        try:
            logger.info("[OCR] 调用 PaddleOCR.ocr() 进行识别...")
            # 新版 PaddleOCR 不再支持 cls 参数，改为 use_textline_orientation
            try:
                result = self._ocr.ocr(image_path, use_textline_orientation=True)
            except TypeError:
                # 如果仍然不支持，则使用无参数调用
                logger.warning("[OCR] 使用默认参数调用 ocr()")
                result = self._ocr.ocr(image_path)

            if not result:
                logger.warning("[OCR] OCR 返回结果为空")
                return []

            text_lines: List[Tuple[str, float]] = []
            
            # 调试：打印返回数据结构
            logger.info("[OCR] 返回结果类型: %s", type(result))
            logger.info("[OCR] 返回结果长度: %d", len(result) if result else 0)
            
            # 检查 result[0] 的类型
            if result and len(result) > 0:
                logger.info("[OCR] result[0] 类型: %s", type(result[0]))
                
                # 新版 PaddleOCR 可能返回字典格式（OCRResult 对象）
                if hasattr(result[0], 'keys') or isinstance(result[0], dict):
                    ocr_result = result[0]
                    logger.info("[OCR] 检测到字典/OCRResult 格式，keys: %s", ocr_result.keys())
                    
                    # 检查是否包含 rec_texts 和 rec_scores（新版格式）
                    if 'rec_texts' in ocr_result and 'rec_scores' in ocr_result:
                        rec_texts = ocr_result['rec_texts']
                        rec_scores = ocr_result['rec_scores']
                        
                        logger.info("[OCR] 提取到 %d 个文本项", len(rec_texts))
                        
                        # 组合文本和置信度
                        for text, score in zip(rec_texts, rec_scores):
                            if text and text.strip():  # 过滤空文本
                                text_lines.append((text.strip(), float(score)))
                        
                        logger.info("[OCR] 成功解析 %d 行有效文本", len(text_lines))
                        logger.info("[OCR] 图片 OCR 完成，识别到 %d 行文本", len(text_lines))
                        return text_lines
                    
                    # 兼容旧版字典格式
                    elif 'rec_text' in ocr_result:
                        logger.info("[OCR] 检测到旧版字典格式，使用旧逻辑")
                        ocr_results = result
                    elif 'det_boxes' in ocr_result:
                        logger.info("[OCR] 检测到另一种字典格式")
                        ocr_results = result
                    else:
                        logger.warning("[OCR] 未知的字典格式，无法找到 rec_texts/rec_text/det_boxes")
                        return []
                elif isinstance(result[0], (list, tuple)):
                    # 旧版列表格式
                    ocr_results = result[0]
                else:
                    logger.warning("[OCR] 未知的返回格式")
                    return []
            else:
                logger.warning("[OCR] result 为空或长度为 0")
                return []
            
            # 处理字典格式
            if isinstance(result[0], dict):
                for idx, item in enumerate(result):
                    try:
                        if 'rec_text' in item and 'rec_score' in item:
                            text = item['rec_text']
                            confidence = item['rec_score']
                            text_lines.append((text, float(confidence)))
                        else:
                            logger.warning("[OCR] 字典项 %d 缺少必要字段: %s", idx, item.keys())
                    except Exception as e:
                        logger.warning("[OCR] 解析字典项 %d 时出错: %s", idx, e)
                        continue
            else:
                # 处理列表格式
                for idx, line in enumerate(ocr_results):
                    try:
                        # 尝试解析数据结构
                        if isinstance(line, (list, tuple)) and len(line) >= 2:
                            # 标准格式: [[bbox], [text, confidence]]
                            if isinstance(line[1], (list, tuple)) and len(line[1]) >= 2:
                                text = line[1][0]
                                confidence = line[1][1]
                            # 新格式: [[bbox], text, confidence] 或其他
                            elif isinstance(line[1], str):
                                text = line[1]
                                confidence = line[2] if len(line) > 2 else 0.9
                            else:
                                logger.warning("[OCR] 无法解析行 %d 的数据结构: %s", idx, line)
                                continue
                        else:
                            logger.warning("[OCR] 行 %d 数据格式异常: %s", idx, line)
                            continue
                        
                        text_lines.append((text, float(confidence)))
                        
                    except (IndexError, TypeError, ValueError) as e:
                        logger.warning("[OCR] 解析行 %d 时出错: %s, 数据: %s", idx, e, line)
                        continue

            logger.info("[OCR] 图片 OCR 完成，识别到 %d 行文本", len(text_lines))
            return text_lines
        except Exception as exc:
            logger.exception("[OCR] OCR 处理图片失败: %s", exc)
            return []

    def process_pdf(self, pdf_path: str) -> List[Tuple[str, float]]:
        logger.info("[OCR] 开始处理 PDF: %s", pdf_path)
        
        if not self._ensure_ocr_initialized():
            logger.error("[OCR] PaddleOCR 未初始化成功，无法处理 PDF %s", pdf_path)
            return []

        try:
            logger.info("[OCR] 将 PDF 转换为图片...")
            
            # 如果配置了自定义 Poppler 路径，使用它
            poppler_path = settings.POPPLER_PATH
            if poppler_path:
                logger.info("[OCR] 使用自定义 Poppler 路径: %s", poppler_path)
                images = self.pdf2image.convert_from_path(pdf_path, poppler_path=poppler_path)
            else:
                logger.info("[OCR] 使用系统 PATH 中的 Poppler")
                images = self.pdf2image.convert_from_path(pdf_path)
            
            logger.info("[OCR] PDF 转换完成，共 %d 页", len(images))

            all_text_lines: List[Tuple[str, float]] = []
            for idx, image in enumerate(images):
                logger.info("[OCR] 正在处理第 %d/%d 页...", idx + 1, len(images))
                temp_image_path = f"temp_page_{idx}.jpg"
                image.save(temp_image_path, "JPEG")

                text_lines = self.process_image(temp_image_path)
                all_text_lines.extend(text_lines)

                os.remove(temp_image_path)

            logger.info("[OCR] PDF OCR 完成，共识别到 %d 行文本", len(all_text_lines))
            return all_text_lines
        except Exception as exc:
            logger.exception("[OCR] OCR 处理 PDF 失败: %s", exc)
            return []

    def process_file(self, file_path: str) -> List[Tuple[str, float]]:
        file_ext = os.path.splitext(file_path)[1].lower()
        logger.info("[OCR] 准备处理文件: %s (扩展名: %s)", file_path, file_ext)

        if file_ext == ".pdf":
            logger.info("[OCR] 文件类型为 PDF，调用 process_pdf")
            return self.process_pdf(file_path)
        if file_ext in [".jpg", ".jpeg", ".png", ".bmp"]:
            logger.info("[OCR] 文件类型为图片，调用 process_image")
            return self.process_image(file_path)
        
        logger.error("[OCR] 不支持的文件类型: %s", file_ext)
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
    logger.info("=== 开始创建 OCR 引擎 ===")
    logger.info("[CONFIG] OCR_ENABLED = %s", settings.OCR_ENABLED)
    
    if not settings.OCR_ENABLED:
        logger.warning("[CONFIG] OCR 功能已在配置中禁用，使用 DummyOCREngine")
        return DummyOCREngine()

    try:
        logger.info("[OCR] 尝试初始化 PaddleOCREngine...")
        engine = PaddleOCREngine()
        logger.info("[OCR] PaddleOCREngine 创建成功（实际初始化将在首次使用时进行）")
        return engine
    except Exception as exc:
        logger.exception("[OCR] 初始化 PaddleOCR 引擎失败，降级为 DummyOCREngine: %s", exc)
        return DummyOCREngine()


# 创建全局 OCR 引擎实例
logger.info("[INIT] 模块加载中，准备创建全局 OCR 引擎实例...")
ocr_engine: BaseOCREngine = create_ocr_engine()
logger.info("[INIT] 全局 OCR 引擎实例创建完成: %s", type(ocr_engine).__name__)

