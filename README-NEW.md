# To-Docx - 文档转换工具

功能强大的桌面应用程序，支持将各种格式的文档（EPUB、Markdown、TXT）、音频、视频转换为 Word 文档。

## 功能特性

- 📄 **文档转换**：支持 EPUB 格式转换为 DOCX
- 🎵 **音频转录**：将音频文件转换为文本并生成 Word 文档
- 🎥 **视频转录**：提取视频音频并转录为文本文档
- 💡 **智能格式化**：自动识别章节结构，保留原始格式

## 技术栈

- 前端：Taro + React + TypeScript
- 后端：FastAPI + Python 3.11
- 桌面应用：Electron
- AI 服务：阿里云 DashScope API

## 快速开始

### 开发模式

```powershell
# 启动开发环境（PowerShell）
.\dev.ps1
```

### 生产打包

```powershell
# 构建安装包（PowerShell）
.\build.ps1
```

安装包位置：`electron\dist\`

## 配置

编辑 `backend/config/config.yaml`，填入你的 DashScope API Key：

```yaml
dashscope:
  api_key: "your-api-key-here"
```

获取 API Key：https://dashscope.console.aliyun.com/

## 常见问题

### 打包后无法启动

查看日志：`%APPDATA%\to-docx-desktop\app.log`

检查：
- `backend/dist/to-docx-backend.exe` 是否存在
- `backend/config/config.yaml` 配置是否正确

### 重新构建

```powershell
# 清理并重新安装依赖
cd electron
Remove-Item -Recurse -Force node_modules, dist
pnpm install
pnpm build:win
```

## 许可证

MIT

