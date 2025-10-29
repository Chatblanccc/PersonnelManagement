import logging
from typing import Dict, List, Tuple

from app.config import settings
from app.ocr.ocr_engine import ocr_engine
from app.ocr.field_parser import FieldParser

logger = logging.getLogger(__name__)


class OCRService:
    """OCR 服务：协调 OCR 识别和字段解析"""
    
    @staticmethod
    def process_contract_file(file_path: str) -> Tuple[Dict, Dict[str, float], str, List[str]]:
        """
        处理合同文件
        返回：(字段字典, 置信度字典, 原始文本, 低置信字段)
        """
        logger.info("=" * 60)
        logger.info("[SERVICE] OCRService.process_contract_file 开始处理: %s", file_path)
        logger.info("[SERVICE] 当前 OCR 引擎类型: %s", type(ocr_engine).__name__)
        logger.info("[SERVICE] OCR 引擎 enabled 属性: %s", getattr(ocr_engine, "enabled", "未定义"))
        
        # 1. OCR 识别
        if not getattr(ocr_engine, "enabled", True):
            logger.warning("[SERVICE] OCR 引擎 enabled=False，跳过识别")
            return {}, {}, "OCR 功能已禁用，未执行识别", []

        logger.info("[SERVICE] 调用 ocr_engine.process_file(%s)", file_path)
        text_lines = ocr_engine.process_file(file_path)
        logger.info("[SERVICE] ocr_engine.process_file 返回了 %d 行文本", len(text_lines))
        
        if not text_lines:
            logger.warning("[SERVICE] OCR 未识别到任何文本，返回空结果")
            return {}, {}, "", []
        
        # 2. 获取原始文本
        logger.info("[SERVICE] 提取原始文本...")
        raw_text = ocr_engine.get_full_text(text_lines)
        logger.info("[SERVICE] 原始文本长度: %d 字符", len(raw_text))
        
        # 3. 字段解析
        logger.info("[SERVICE] 开始字段解析...")
        parser = FieldParser(text_lines)
        fields, confidence = parser.extract_all_fields()
        logger.info("[SERVICE] 字段解析完成，提取了 %d 个字段", len(fields))
        
        # 4. 计算平均置信度
        if confidence:
            avg_confidence = sum(confidence.values()) / len(confidence)
            fields['ocr_confidence'] = avg_confidence
            logger.info("[SERVICE] 平均置信度: %.2f", avg_confidence)
        else:
            fields['ocr_confidence'] = 0.0
            logger.warning("[SERVICE] 未获取到任何字段置信度")
        
        threshold = settings.OCR_CONFIDENCE_THRESHOLD or 0.8
        low_confidence = OCRService.get_low_confidence_fields(confidence, threshold)
        logger.info("[SERVICE] 低置信度字段 (< %.2f): %s", threshold, low_confidence)
        
        logger.info("[SERVICE] *** OCR 处理完成 ***")
        logger.info("=" * 60)

        return fields, confidence, raw_text, low_confidence
    
    @staticmethod
    def get_low_confidence_fields(confidence: Dict[str, float], threshold: float = 0.8) -> list:
        """获取置信度低于阈值的字段"""
        return [field for field, conf in confidence.items() if conf < threshold]

ocr_service = OCRService()

