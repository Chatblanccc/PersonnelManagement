from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from paddleocr import PaddleOCR

class OCRRequest(BaseModel):
    file_paths: List[str]

ocr = PaddleOCR(use_angle_cls=True, lang='ch')
app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/recognize")
def recognize(request: OCRRequest):
    results = []
    for path in request.file_paths:
        ocr_result = ocr.ocr(path, cls=True)
        results.append({"file": path, "result": ocr_result})
    return {"data": results}

