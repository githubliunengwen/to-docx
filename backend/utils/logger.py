"""Logging Configuration"""
import sys
import os
import platform
from pathlib import Path
from loguru import logger

from config import settings


def get_log_directory():
    """获取日志目录路径（使用用户数据目录）"""
    # 检查是否在打包环境中
    if getattr(sys, 'frozen', False):
        # 打包后的应用，使用用户数据目录
        if platform.system() == "Windows":
            app_data = Path(os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming'))
            log_dir = app_data / 'to-docx-desktop' / 'logs'
        else:
            log_dir = Path.home() / '.to-docx' / 'logs'
    else:
        # 开发环境，使用项目目录
        log_dir = Path.cwd() / "logs"

    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def setup_logger():
    """Setup logger configuration"""
    # Remove default logger
    logger.remove()

    # Console logger
    logger.add(
        sys.stdout,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="DEBUG" if settings.debug else "INFO"
    )

    # File logger - 使用用户数据目录
    log_dir = get_log_directory()

    logger.add(
        log_dir / "app_{time:YYYY-MM-DD}.log",
        rotation="00:00",
        retention="7 days",
        compression="zip",
        encoding="utf-8",
        level="DEBUG"
    )

    return logger


# Initialize logger
setup_logger()
