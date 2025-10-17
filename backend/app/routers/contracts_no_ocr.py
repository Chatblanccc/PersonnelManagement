from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import shutil
import math
from datetime import datetime
import io

from app.database import get_db
from app.schemas.contract import (
    ContractCreate,
    ContractUpdate,
    ContractResponse,
    PaginatedResponse,
    OcrResult,
)
from app.services.contract_service import ContractService
# from app.ocr.ocr_service import ocr_service  # Temporarily disabled
from app.utils.excel_export import exporter
from app.config import settings

router = APIRouter()

# 确保上传目录存在
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@router.post("/contracts/upload", response_model=OcrResult)
async def upload_contract(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    上传合同文件并进行 OCR 识别
    注意: OCR 功能暂时禁用，请手动创建合同记录
    """
    # 验证文件类型
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="不支持的文件类型")
    
    # 验证文件大小
    file.file.seek(0, 2)  # 移动到文件末尾
    file_size = file.file.tell()
    file.file.seek(0)  # 移回开始
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制")
    
    # 生成唯一文件名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    # 保存文件
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    
    # OCR 识别 - 暂时禁用，返回空数据
    return OcrResult(
        contract={
            "file_url": file_path,
            "teacher_code": "待填写",
            "name": "待填写",
        },
        confidence={},
        raw_text="OCR 功能暂时禁用，请安装 PaddleOCR 后启用。\n请手动填写合同信息。"
    )


@router.get("/contracts", response_model=PaginatedResponse)
async def get_contracts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    department: Optional[str] = None,
    job_status: Optional[str] = None,
    search: Optional[str] = None,
    approval_status: Optional[str] = Query('approved'),
    db: Session = Depends(get_db)
):
    """
    获取合同列表（分页）
    """
    contracts, total = ContractService.get_contracts(
        db=db,
        page=page,
        page_size=page_size,
        department=department,
        job_status=job_status,
        search=search,
        approval_status=approval_status,
    )
    
    total_pages = math.ceil(total / page_size)
    
    return PaginatedResponse(
        data=[ContractResponse.model_validate(c) for c in contracts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: str,
    db: Session = Depends(get_db)
):
    """
    获取单个合同详情
    """
    contract = ContractService.get_contract(db, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    
    return ContractResponse.model_validate(contract)


@router.post("/contracts", response_model=ContractResponse)
async def create_contract(
    contract: ContractCreate,
    db: Session = Depends(get_db)
):
    """
    创建合同记录
    """
    try:
        db_contract = ContractService.create_contract(db, contract)
        return ContractResponse.model_validate(db_contract)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"创建失败: {str(e)}")


@router.patch("/contracts/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: str,
    contract_update: ContractUpdate,
    db: Session = Depends(get_db)
):
    """
    更新合同信息
    """
    contract = ContractService.update_contract(db, contract_id, contract_update)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    
    return ContractResponse.model_validate(contract)


@router.delete("/contracts/{contract_id}")
async def delete_contract(
    contract_id: str,
    db: Session = Depends(get_db)
):
    """
    删除合同
    """
    success = ContractService.delete_contract(db, contract_id)
    if not success:
        raise HTTPException(status_code=404, detail="合同不存在")
    
    return {"message": "删除成功"}


@router.get("/contracts/export")
async def export_contracts(
    department: Optional[str] = None,
    job_status: Optional[str] = None,
    search: Optional[str] = None,
    approval_status: Optional[str] = Query('approved'),
    db: Session = Depends(get_db)
):
    """
    导出合同列表为 Excel
    """
    contracts = ContractService.get_contracts_for_export(
        db=db,
        department=department,
        job_status=job_status,
        search=search,
        approval_status=approval_status,
    )
    
    # 生成 Excel
    excel_data = exporter.export_contracts(contracts)
    
    # 返回文件流
    filename = f"contracts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        io.BytesIO(excel_data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/contracts/stats/dashboard")
async def get_dashboard_stats(
    db: Session = Depends(get_db)
):
    """
    获取仪表盘统计数据
    """
    from sqlalchemy import func
    from app.models.contract import Contract
    
    # 教师总数
    total = db.query(func.count(Contract.id)).filter(Contract.approval_status == "approved").scalar()
    
    # 在职合同数
    active = db.query(func.count(Contract.id)).filter(
        Contract.approval_status == "approved",
        Contract.job_status == '在职'
    ).scalar()
    
    # 即将到期（30天内）
    expiring = ContractService.get_expiring_contracts(db, days=30)
    
    # 待复核（OCR 置信度低于 0.8）
    pending_review = db.query(func.count(Contract.id)).filter(
        Contract.approval_status == "approved",
        Contract.ocr_confidence < 0.8
    ).scalar()
    
    return {
        "totalTeachers": total or 0,
        "activeContracts": active or 0,
        "expiringSoon": len(expiring),
        "pendingReview": pending_review or 0,
    }

