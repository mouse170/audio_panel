"""
版本控制與應用程式中繼資訊模組 (Version & Metadata Module)
遵循 0.0.0.0 四段式版本規範 (Major.Minor.Patch.Build)
"""

from pathlib import Path

APP_NAME = "audio_panel"
APP_DISPLAY_NAME = "Audio Panel"
VERSION = "0.2.0.0"

# Google Drive 24 字元防截斷安全縮寫代號 (audio_panel -> AP，或保留 10 字元內代號)
PACKAGE_NAME_PREFIX = "audio_panel"
SHORT_PACKAGE_PREFIX = "AP"


def get_version_str() -> str:
    """取得標準四段式版本字串 (0.0.0.0)"""
    version_file = Path(__file__).resolve().parent / "VERSION"
    if version_file.exists():
        content = version_file.read_text(encoding="utf-8").strip()
        if content:
            return content
    return VERSION


def get_git_tag() -> str:
    """取得對應之 Git Tag 標準名稱 (v0.0.0.0)"""
    return f"v{get_version_str()}"


def get_app_title() -> str:
    """取得包含版本號之主視窗標題字串"""
    ver = get_version_str()
    return f"{APP_DISPLAY_NAME} v{ver} ({APP_NAME})"


def get_package_name(ext: str = "zip", enforce_24char: bool = True) -> str:
    """
    取得符合 Windows 與 Google Drive 24 字元防截斷規範之離線包檔案名稱
    """
    ext_clean = ext.lstrip(".")
    ver = get_version_str()
    full_name = f"{PACKAGE_NAME_PREFIX}_v{ver}.{ext_clean}"
    if enforce_24char and len(full_name) > 24:
        return f"{SHORT_PACKAGE_PREFIX}_v{ver}.{ext_clean}"
    return full_name
