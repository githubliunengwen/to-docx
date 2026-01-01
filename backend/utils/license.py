"""
激活码验证模块
用于获取机器码和验证激活码
"""
import os
import hashlib
import hmac
import base64
import platform
import subprocess
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict
from loguru import logger

# 密钥（与生成器保持一致）
SECRET_KEY = b"TO_DOCX_SECRET_KEY_2024_CHANGE_THIS_IN_PRODUCTION"

# 激活码存储路径 - 使用可写的用户数据目录
def get_license_file_path() -> Path:
    """获取激活码文件路径"""
    if getattr(sys, 'frozen', False):
        # 打包后的应用，使用应用数据目录
        if platform.system() == "Windows":
            app_data = Path(os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming'))
            license_dir = app_data / 'to-docx-desktop'
        else:
            license_dir = Path.home() / '.to-docx'
    else:
        # 开发环境，使用项目目录
        license_dir = Path(__file__).parent.parent / "config"

    license_dir.mkdir(parents=True, exist_ok=True)
    return license_dir / "license.dat"

import sys
LICENSE_FILE = get_license_file_path()
logger.info(f"License file path: {LICENSE_FILE}")


def get_machine_code() -> str:
    """
    获取机器码（基于硬件信息生成唯一标识）

    Returns:
        机器码字符串
    """
    try:
        system = platform.system()

        # 获取硬件信息
        hardware_info = []

        # 1. CPU信息
        if system == "Windows":
            try:
                # Windows: 使用wmic获取CPU序列号
                result = subprocess.check_output(
                    "wmic cpu get ProcessorId",
                    shell=True,
                    stderr=subprocess.DEVNULL
                ).decode().strip()
                cpu_id = result.split('\n')[1].strip()
                hardware_info.append(cpu_id)
            except:
                pass
        elif system == "Linux":
            try:
                # Linux: 使用dmidecode或读取/proc/cpuinfo
                with open('/proc/cpuinfo', 'r') as f:
                    for line in f:
                        if 'Serial' in line:
                            hardware_info.append(line.split(':')[1].strip())
                            break
            except:
                pass
        elif system == "Darwin":  # macOS
            try:
                result = subprocess.check_output(
                    "system_profiler SPHardwareDataType | grep 'Serial Number'",
                    shell=True
                ).decode().strip()
                serial = result.split(':')[1].strip()
                hardware_info.append(serial)
            except:
                pass

        # 2. 主板序列号 (Windows)
        if system == "Windows":
            try:
                result = subprocess.check_output(
                    "wmic baseboard get SerialNumber",
                    shell=True,
                    stderr=subprocess.DEVNULL
                ).decode().strip()
                board_serial = result.split('\n')[1].strip()
                hardware_info.append(board_serial)
            except:
                pass

        # 3. MAC地址
        try:
            if system == "Windows":
                result = subprocess.check_output(
                    "getmac",
                    shell=True,
                    stderr=subprocess.DEVNULL
                ).decode().strip()
                mac = result.split('\n')[1].split()[0]
                hardware_info.append(mac)
            else:
                import uuid
                mac = ':'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff)
                               for ele in range(0, 8*6, 8)][::-1])
                hardware_info.append(mac)
        except:
            pass

        # 4. 计算机名
        hardware_info.append(platform.node())

        # 组合所有硬件信息
        combined_info = "|".join(filter(None, hardware_info))

        # 如果没有获取到任何硬件信息，使用备用方案
        if not combined_info:
            combined_info = f"{platform.system()}|{platform.machine()}|{platform.node()}"

        # 生成机器码（SHA256哈希）
        machine_code = hashlib.sha256(combined_info.encode()).hexdigest()[:16].upper()

        logger.info(f"Machine code generated: {machine_code}")
        return machine_code

    except Exception as e:
        logger.error(f"Failed to generate machine code: {e}")
        # 备用方案：使用系统和主机名生成
        fallback = f"{platform.system()}|{platform.node()}"
        return hashlib.sha256(fallback.encode()).hexdigest()[:16].upper()


def verify_license_code(machine_code: str, license_code: str) -> Dict[str, any]:
    """
    验证激活码

    Args:
        machine_code: 当前机器码
        license_code: 激活码

    Returns:
        dict: {"valid": bool, "api_key": str, "quota": float, "expire_date": str, "message": str}
    """
    try:
        # Base64解码
        combined = base64.b64decode(license_code.encode())

        # 分离数据和签名
        parts = combined.split(b"|")
        if len(parts) != 2:
            return {"valid": False, "message": "Activation code format error"}

        data_str, signature = parts

        # 验证签名
        expected_signature = hmac.new(SECRET_KEY, data_str, hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected_signature):
            return {"valid": False, "message": "Activation code signature verification failed"}

        # 解析数据
        data = json.loads(data_str.decode())

        # 验证机器码
        if data["machine"] != machine_code:
            return {"valid": False, "message": "Activation code does not match this machine"}

        # 验证过期时间
        expire_date = datetime.strptime(data["expire"], "%Y-%m-%d")
        if datetime.now() > expire_date:
            return {"valid": False, "message": f"Activation code expired (Expire date: {data['expire']})"}

        return {
            "valid": True,
            "api_key": data.get("api_key", ""),
            "quota": data.get("quota", 0),
            "expire_date": data["expire"],
            "message": "Activation successful"
        }

    except Exception as e:
        logger.error(f"License verification failed: {e}")
        return {"valid": False, "message": f"Activation code verification failed: {str(e)}"}


def save_license(license_code: str) -> bool:
    """
    保存激活码到文件

    Args:
        license_code: 激活码

    Returns:
        bool: 是否保存成功
    """
    try:
        LICENSE_FILE.parent.mkdir(parents=True, exist_ok=True)
        LICENSE_FILE.write_text(license_code.strip(), encoding='utf-8')
        logger.info(f"License saved to {LICENSE_FILE}")
        return True
    except Exception as e:
        logger.error(f"Failed to save license: {e}")
        return False


def load_license() -> Optional[str]:
    """
    从文件加载激活码

    Returns:
        激活码字符串，如果不存在则返回None
    """
    try:
        if LICENSE_FILE.exists():
            license_code = LICENSE_FILE.read_text(encoding='utf-8').strip()
            logger.info("License loaded from file")
            return license_code
        return None
    except Exception as e:
        logger.error(f"Failed to load license: {e}")
        return None


def check_activation() -> Dict[str, any]:
    """
    检查软件激活状态

    Returns:
        dict: {
            "activated": bool,
            "machine_code": str,
            "expire_date": str (如果已激活),
            "quota_info": dict (额度信息),
            "message": str
        }
    """
    from utils.quota_manager import quota_manager

    # 获取机器码
    machine_code = get_machine_code()

    # 加载激活码
    license_code = load_license()

    if not license_code:
        return {
            "activated": False,
            "machine_code": machine_code,
            "message": "Software not activated"
        }

    # 验证激活码
    result = verify_license_code(machine_code, license_code)

    # 如果激活码有效，设置API密钥到环境变量
    if result["valid"]:
        api_key = result.get("api_key", "")
        if api_key:
            os.environ["DASHSCOPE_API_KEY"] = api_key
            logger.info("DASHSCOPE_API_KEY loaded from license")

    if result["valid"]:
        # 检查额度
        quota_info = quota_manager.get_quota_info()

        # 检查额度是否用完
        if quota_info and quota_info.get("remaining_quota", 0) <= 0:
            return {
                "activated": False,
                "machine_code": machine_code,
                "expire_date": result["expire_date"],
                "quota_info": quota_info,
                "message": "Quota exhausted, please reactivate"
            }

        return {
            "activated": True,
            "machine_code": machine_code,
            "expire_date": result["expire_date"],
            "quota_info": quota_info,
            "message": result["message"]
        }
    else:
        return {
            "activated": False,
            "machine_code": machine_code,
            "message": result["message"]
        }


def activate_software(license_code: str) -> Dict[str, any]:
    """
    激活软件

    Args:
        license_code: 激活码

    Returns:
        dict: {"success": bool, "message": str, "expire_date": str, "quota": float}
    """
    from utils.quota_manager import quota_manager
    import os

    machine_code = get_machine_code()
    # 激活校验时，先比对激活码是否发生改变
    #
    # ,没发生改变时，不用更新信息，返回激活码未改变

    # 检查激活码是否发生改变
    existing_license = load_license()
    if existing_license and existing_license.strip() == license_code.strip():
        return {
            "success": False,
            "message": "激活码未改变"
        }

    # 验证激活码
    result = verify_license_code(machine_code, license_code)

    if result["valid"]:
        # 保存激活码
        if save_license(license_code):
            # 保存API KEY到环境变量或配置文件
            api_key = result.get("api_key", "")
            quota = result.get("quota", 0)

            # 设置DASHSCOPE_API_KEY环境变量
            if api_key:
                os.environ["DASHSCOPE_API_KEY"] = api_key
                logger.info("DASHSCOPE_API_KEY set successfully")

            # 保存额度信息
            if quota_manager.save_quota(api_key, quota):
                logger.info(f"Quota saved: {quota} yuan")
                return {
                    "success": True,
                    "message": "Activation successful",
                    "expire_date": result["expire_date"],
                    "quota": quota,
                    "api_key_set": bool(api_key)
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to save quota information"
                }
        else:
            return {
                "success": False,
                "message": "Failed to save activation code"
            }
    else:
        return {
            "success": False,
            "message": result["message"]
        }
