"""
License management routes
激活码管理路由
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger

from utils.license import (
    get_machine_code,
    check_activation,
    activate_software
)

router = APIRouter(prefix="/api/license", tags=["license"])


class ActivationRequest(BaseModel):
    """激活请求模型"""
    license_code: str


class ActivationResponse(BaseModel):
    """激活响应模型"""
    success: bool
    message: str
    expire_date: str = None


class LicenseStatusResponse(BaseModel):
    """激活状态响应模型"""
    activated: bool
    machine_code: str
    expire_date: str = None
    message: str


@router.get("/status", response_model=LicenseStatusResponse)
async def get_license_status():
    """
    获取激活状态
    返回当前软件的激活状态和机器码
    """
    try:
        result = check_activation()
        logger.info(f"License status checked: {result['activated']}")
        return result
    except Exception as e:
        logger.error(f"Failed to check license status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/machine-code")
async def get_machine_code_api():
    """
    获取机器码
    返回当前机器的唯一标识码
    """
    try:
        machine_code = get_machine_code()
        logger.info(f"Machine code requested: {machine_code}")
        return {"machine_code": machine_code}
    except Exception as e:
        logger.error(f"Failed to get machine code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/activate", response_model=ActivationResponse)
async def activate(request: ActivationRequest):
    """
    激活软件
    使用激活码激活软件
    """
    try:
        result = activate_software(request.license_code)

        if result["success"]:
            logger.info(f"Software activated successfully, expire: {result['expire_date']}")
        else:
            logger.warning(f"Activation failed: {result['message']}")

        return result
    except Exception as e:
        logger.error(f"Activation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/deactivate")
async def deactivate():
    """
    取消激活
    删除激活码（用于测试或重新激活）
    """
    try:
        from pathlib import Path
        from utils.quota_manager import quota_manager

        license_file = Path(__file__).parent.parent / "config" / "license.dat"
        quota_file = Path(__file__).parent.parent / "config" / "quota.dat"

        success = False
        if license_file.exists():
            license_file.unlink()
            success = True
            logger.info("License deactivated")

        if quota_file.exists():
            quota_file.unlink()
            logger.info("Quota data cleared")

        if success:
            return {"success": True, "message": "Deactivation successful"}
        else:
            return {"success": False, "message": "No active license found"}

    except Exception as e:
        logger.error(f"Deactivation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quota")
async def get_quota_info():
    """
    获取额度信息
    返回当前可用额度和使用情况
    """
    try:
        from utils.quota_manager import quota_manager

        quota_info = quota_manager.get_quota_info()
        if not quota_info:
            return {
                "success": False,
                "message": "No quota information found",
                "data": None
            }

        return {
            "success": True,
            "message": "Quota information retrieved successfully",
            "data": quota_info
        }
    except Exception as e:
        logger.error(f"Failed to get quota info: {e}")
        raise HTTPException(status_code=500, detail=str(e))
