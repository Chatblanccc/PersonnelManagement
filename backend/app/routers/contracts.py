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
from app.utils.auth import require_permission
from app.schemas.contract import (
    ContractCreate,
    ContractUpdate,
    ContractResponse,
    PaginatedResponse,
    OcrResult,
    ContractLifecycleResponse,
)
from app.services.contract_service import ContractService
from app.models.contract import Contract
from app.ocr.ocr_service import ocr_service
from app.utils.excel_export import exporter
from app.utils.excel_import import parse_contracts_from_bytes, FIELD_TO_LABEL
from pydantic import ValidationError
from app.config import settings

router = APIRouter()

# 确保上传目录存在
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@router.post("/contracts/upload", response_model=OcrResult, dependencies=[Depends(require_permission("contracts.create"))])
async def upload_contract(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    上传合同文件并进行 OCR 识别
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
    
    # OCR 识别
    try:
        fields, confidence, raw_text = ocr_service.process_contract_file(file_path)
        
        # 添加文件路径
        fields['file_url'] = file_path
        
        return OcrResult(
            contract=fields,
            confidence=confidence,
            raw_text=raw_text
        )
    except Exception as e:
        # 删除上传的文件
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"OCR 识别失败: {str(e)}")


@router.get("/contracts/template", dependencies=[Depends(require_permission("contracts.read"))])
async def download_contract_template():
    """
    下载合同导入模板
    """
    excel_data = exporter.generate_template()

    filename = f"contract_template_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        io.BytesIO(excel_data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.post("/contracts/import", dependencies=[Depends(require_permission("contracts.import"))])
async def import_contracts(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    导入合同 Excel
    """
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="请上传 Excel 文件 (.xlsx/.xls)")

    content = await file.read()
    try:
        parsed_records = parse_contracts_from_bytes(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    created = 0
    updated = 0
    errors: list[str] = []

    for row_index, record in parsed_records:
        record['approval_status'] = record.get('approval_status') or "approved"
        teacher_code = record.get('teacher_code')
        if not teacher_code:
            errors.append(f'第 {row_index} 行缺少工号，已跳过')
            continue

        # 自动计算教龄
        if record.get('teaching_years') is None and record.get('start_work_date'):
            record['teaching_years'] = _calculate_teaching_years(record['start_work_date'])

        existing = db.query(Contract).filter_by(teacher_code=teacher_code).first()

        if existing:
            try:
                update_payload = ContractUpdate(**record)
                ContractService.update_contract(db, existing.id, update_payload)
                updated += 1
            except ValidationError as exc:
                error_msgs = '; '.join(
                    [f"{FIELD_TO_LABEL.get(err['loc'][-1], err['loc'][-1])}: {err['msg']}" for err in exc.errors()]
                )
                errors.append(f'第 {row_index} 行数据校验失败：{error_msgs}')
            except Exception as exc:
                errors.append(f'第 {row_index} 行更新失败：{exc}')
        else:
            try:
                create_payload = ContractCreate(**record)
                ContractService.create_contract(db, create_payload)
                created += 1
            except ValidationError as exc:
                error_msgs = '; '.join(
                    [f"{FIELD_TO_LABEL.get(err['loc'][-1], err['loc'][-1])}: {err['msg']}" for err in exc.errors()]
                )
                errors.append(f'第 {row_index} 行数据校验失败：{error_msgs}')
            except Exception as exc:
                errors.append(f'第 {row_index} 行创建失败：{exc}')

    return {
        "imported": created + updated,
        "created": created,
        "updated": updated,
        "errors": errors,
    }



@router.get("/contracts", response_model=PaginatedResponse, dependencies=[Depends(require_permission("contracts.read"))])
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


@router.get("/contracts/export", dependencies=[Depends(require_permission("contracts.export"))])
async def export_contracts(
    department: Optional[str] = None,
    job_status: Optional[str] = None,
    search: Optional[str] = None,
    approval_status: Optional[str] = Query('approved'),
    ids: Optional[list[str]] = Query(None),
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
        ids=ids,
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


@router.get("/contracts/{contract_id}", response_model=ContractResponse, dependencies=[Depends(require_permission("contracts.read"))])
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


@router.get("/contracts/{contract_id}/lifecycle", response_model=ContractLifecycleResponse, dependencies=[Depends(require_permission("contracts.read"))])
async def get_contract_lifecycle(
    contract_id: str,
    db: Session = Depends(get_db)
):
    lifecycle = ContractService.get_contract_lifecycle(db, contract_id)
    if not lifecycle:
        raise HTTPException(status_code=404, detail="合同不存在")
    return lifecycle


@router.post("/contracts", response_model=ContractResponse, dependencies=[Depends(require_permission("contracts.create"))])
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


@router.patch("/contracts/{contract_id}", response_model=ContractResponse, dependencies=[Depends(require_permission("contracts.update"))])
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


@router.delete("/contracts/{contract_id}", dependencies=[Depends(require_permission("contracts.delete"))])
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


@router.get("/contracts/stats/dashboard", dependencies=[Depends(require_permission("contracts.audit"))])
async def get_dashboard_stats(
    db: Session = Depends(get_db)
):
    """
    获取仪表盘统计数据
    """
    from sqlalchemy import func
    from app.models.contract import Contract
    
    # 教师总数
    total = db.query(func.count(Contract.id)).filter(Contract.approval_status == "approved").scalar() or 0
    
    # 在职合同数
    active = db.query(func.count(Contract.id)).filter(
        Contract.approval_status == "approved",
        Contract.job_status == '在职'
    ).scalar() or 0
    
    # 即将到期（30天内）
    expiring = ContractService.get_expiring_contracts(db, days=30)

    # 待复核（OCR 置信度低于 0.8）
    breakdown = ContractService.get_dashboard_breakdown(db)

    return {
        "totalTeachers": total,
        "activeContracts": active,
        "expiringSoon": len(expiring),
        "pendingReview": breakdown['pendingReview'],
        "averageConfidence": breakdown['averageConfidence'],
        "breakdown": breakdown,
        "sidebarSummary": breakdown['sidebarSummary'],
    }


@router.get("/contracts/stats/dashboard/summary", dependencies=[Depends(require_permission("contracts.audit"))])
async def get_dashboard_summary(
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    from app.models.contract import Contract

    breakdown = ContractService.get_dashboard_breakdown(db)
    expiring_30 = breakdown['sidebarSummary']['expiringWithin30Days']

    return {
        "pendingReview": breakdown['sidebarSummary']['pendingReview'],
        "probationTeachers": breakdown['sidebarSummary']['probationTeachers'],
        "expiringWithin30Days": expiring_30,
        "expiringWithin90Days": breakdown['sidebarSummary']['expiringWithin90Days'],
        "averageConfidence": breakdown['sidebarSummary']['averageConfidence'],
    }

