from paddleocr import PaddleOCR
from PIL import Image
import pdf2image
import os
from typing import List, Tuple
from app.config import settings

class OCREngine:
    def __init__(self):
        """初始化 PaddleOCR"""
        device = "gpu:0" if settings.OCR_USE_GPU else "cpu"
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang='ch',
            device=device,
        )
    
    def process_image(self, image_path: str) -> List[Tuple[str, float]]:
        """
        处理单张图片
        返回：[(识别文本, 置信度), ...]
        """
        try:
            result = self.ocr.ocr(image_path, cls=True)
            
            if not result or not result[0]:
                return []
            
            text_lines = []
            for line in result[0]:
                text = line[1][0]  # 识别的文本
                confidence = line[1][1]  # 置信度
                text_lines.append((text, confidence))
            
            return text_lines
        except Exception as e:
            print(f"OCR processing error: {e}")
            return []
    
    def process_pdf(self, pdf_path: str) -> List[Tuple[str, float]]:
        """
        处理 PDF 文件
        将 PDF 转换为图片后进行 OCR
        """
        try:
            # 将 PDF 转换为图片
            images = pdf2image.convert_from_path(pdf_path)
            
            all_text_lines = []
            for i, image in enumerate(images):
                # 保存临时图片
                temp_image_path = f"temp_page_{i}.jpg"
                image.save(temp_image_path, 'JPEG')
                
                # OCR 识别
                text_lines = self.process_image(temp_image_path)
                all_text_lines.extend(text_lines)
                
                # 删除临时文件
                os.remove(temp_image_path)
            
            return all_text_lines
        except Exception as e:
            print(f"PDF processing error: {e}")
            return []
    
    def process_file(self, file_path: str) -> List[Tuple[str, float]]:
        """
        根据文件类型自动选择处理方法
        """
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            return self.process_pdf(file_path)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp']:
            return self.process_image(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
    
    def get_full_text(self, text_lines: List[Tuple[str, float]]) -> str:
        """获取完整的识别文本"""
        return '\n'.join([text for text, _ in text_lines])

# 创建全局 OCR 引擎实例
ocr_engine = OCREngine()

