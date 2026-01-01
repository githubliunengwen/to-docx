"""
额度管理模块
管理用户的可用转换额度（人民币）
"""
import json
import sys
import os
import platform
from pathlib import Path
from typing import Optional, Dict
from loguru import logger
from datetime import datetime

# 额度数据存储路径 - 使用可写的用户数据目录
def get_quota_file_path() -> Path:
    """获取配额文件路径"""
    if getattr(sys, 'frozen', False):
        # 打包后的应用，使用应用数据目录
        if platform.system() == "Windows":
            app_data = Path(os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming'))
            quota_dir = app_data / 'to-docx-desktop'
        else:
            quota_dir = Path.home() / '.to-docx'
    else:
        # 开发环境，使用项目目录
        quota_dir = Path(__file__).parent.parent / "config"

    quota_dir.mkdir(parents=True, exist_ok=True)
    return quota_dir / "quota.dat"

QUOTA_FILE = get_quota_file_path()


class QuotaManager:
    """额度管理器"""

    def __init__(self):
        self.quota_file = QUOTA_FILE
        logger.info(f"QuotaManager initialized with file: {self.quota_file}")
        self._ensure_config_dir()

    def _ensure_config_dir(self):
        """确保配置目录存在"""
        self.quota_file.parent.mkdir(parents=True, exist_ok=True)

    def save_quota(self,api_key: str, total_quota: float) -> bool:
        """
        保存初始额度信息

        Args:
            api_key: DASHSCOPE_API_KEY
            total_quota: 总可用额度（人民币元）

        Returns:
            bool: 是否保存成功
        """
        try:
            data = {
                # 不能直接展示，前三和后4展示出来就行
                "api_key": api_key [:3] + "************" + api_key[-4:],"api_key_hash": api_key,
                "total_quota": total_quota,
                "used_quota": 0.0,
                "remaining_quota": total_quota,
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            }

            with open(self.quota_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            logger.info(f"Quota saved successfully: {total_quota} yuan")
            return True
        except Exception as e:
            logger.error(f"Failed to save quota: {e}")
            return False

    def get_quota_info(self) -> Optional[Dict]:
        """
        获取额度信息

        Returns:
            dict: 额度信息或None
        """
        try:
            if not self.quota_file.exists():
                return None

            with open(self.quota_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            return data
        except Exception as e:
            logger.error(f"Failed to read quota info: {e}")
            return None

    def consume_quota(self, duration_seconds: float) -> Dict[str, any]:
        """
        消耗额度（按0.8元/小时计算）
        允许余额变为负数，但只记录消耗

        Args:
            duration_seconds: 音频文件的实际时长（秒）

        Returns:
            dict: {"success": bool, "message": str, "remaining_quota": float}
        """
        try:
            quota_info = self.get_quota_info()
            if not quota_info:
                return {
                    "success": False,
                    "message": "No quota information found, please activate first",
                    "remaining_quota": 0
                }

            # 计算消耗的额度（人民币元）
            # 按0.8元/小时计算
            duration_hours = duration_seconds / 3600
            consumed = duration_hours * 0.8

            # 更新额度（允许余额变为负数）
            quota_info["used_quota"] += consumed
            quota_info["remaining_quota"] -= consumed
            quota_info["last_updated"] = datetime.now().isoformat()

            # 保存更新后的额度
            with open(self.quota_file, 'w', encoding='utf-8') as f:
                json.dump(quota_info, f, ensure_ascii=False, indent=2)

            remaining = quota_info["remaining_quota"]
            logger.info(f"Quota consumed: {consumed:.4f} yuan, Remaining: {remaining:.4f} yuan")

            return {
                "success": True,
                "message": "Quota consumed successfully",
                "remaining_quota": remaining,
                "consumed": consumed
            }
        except Exception as e:
            logger.error(f"Failed to consume quota: {e}")
            return {
                "success": False,
                "message": f"Failed to consume quota: {str(e)}",
                "remaining_quota": 0
            }

    def check_quota(self, required_quota: float = 0.0) -> Dict[str, any]:
        """
        检查额度是否充足

        Args:
            required_quota: 需要的额度（人民币元）

        Returns:
            dict: {"sufficient": bool, "remaining_quota": float, "message": str}
        """
        try:
            quota_info = self.get_quota_info()
            if not quota_info:
                return {
                    "sufficient": False,
                    "remaining_quota": 0,
                    "message": "未找到密钥额度信息，请先激活"
                }

            remaining = quota_info["remaining_quota"]

            # 检查密钥是否已失效（额度用尽）
            if remaining <= 0:
                return {
                    "sufficient": False,
                    "remaining_quota": 0,
                    "message": "API密钥额度已用尽，请联系管理员更新激活码"
                }

            # 如果指定了所需额度，检查是否足够
            if required_quota > 0 and remaining < required_quota:
                return {
                    "sufficient": False,
                    "remaining_quota": remaining,
                    "message": f"额度不足。所需: {required_quota:.4f} 元，剩余: {remaining:.4f} 元"
                }

            return {
                "sufficient": True,
                "remaining_quota": remaining,
                "message": "Quota sufficient"
            }
        except Exception as e:
            logger.error


            remaining = quota_info["remaining_quota"]

            # 检查密钥是否已失效（额度用尽）
            if remaining <= 0:
                return {
                    "sufficient": False,
                    "remaining_quota": 0,
                    "message": "API密钥额度已用尽，请联系管理员更新激活码"
                }

            # 如果指定了所需额度，检查是否足够
            if required_quota > 0 and remaining < required_quota:
                return {
                    "sufficient": False,
                    "remaining_quota": remaining,
                    "message": f"额度不足。所需: {required_quota:.4f} 元，剩余: {remaining:.4f} 元"
                }

            return {
                "sufficient": True,
                "remaining_quota": remaining,
                "message": "Quota sufficient"
            }
        except Exception as e:
            logger.error(f"Failed to check quota: {e}")
            return {
                "sufficient": False,
                "remaining_quota": 0,
                "message": f"Failed to check quota: {str(e)}"
            }


# 全局额度管理器实例
quota_manager = QuotaManager()
