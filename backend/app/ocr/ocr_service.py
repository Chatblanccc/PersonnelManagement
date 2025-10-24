from typing import Dict, Tuple
from app.ocr.ocr_engine import ocr_engine
from app.ocr.field_parser import FieldParser

class OCRService:
    """OCR 服务：协调 OCR 识别和字段解析"""
    
    @staticmethod
    def process_contract_file(file_path: str) -> Tuple[Dict, Dict[str, float], str]:
        """
        处理合同文件
        返回：(字段字典, 置信度字典, 原始文本)
        """
        # 1. OCR 识别
        if not getattr(ocr_engine, "enabled", True):
            return {}, {}, "OCR 功能已禁用，未执行识别"

        text_lines = ocr_engine.process_file(file_path)
        
        if not text_lines:
            return {}, {}, ""
        
        # 2. 获取原始文本
        raw_text = ocr_engine.get_full_text(text_lines)
        
        # 3. 字段解析
        parser = FieldParser(text_lines)
        fields, confidence = parser.extract_all_fields()
        
        # 4. 计算平均置信度
        if confidence:
            avg_confidence = sum(confidence.values()) / len(confidence)
            fields['ocr_confidence'] = avg_confidence
        else:
            fields['ocr_confidence'] = 0.0
        
        return fields, confidence, raw_text
    
    @staticmethod
    def get_low_confidence_fields(confidence: Dict[str, float], threshold: float = 0.8) -> list:
        """获取置信度低于阈值的字段"""
        return [field for field, conf in confidence.items() if conf < threshold]

ocr_service = OCRService()

