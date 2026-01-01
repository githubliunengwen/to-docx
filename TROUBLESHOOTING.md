# 安装后启动问题诊断指南

## 问题 1: "Cannot find module 'delayed-stream'" 错误

### 原因
Electron 默认将所有文件打包进 asar 归档文件，导致某些 Node.js 模块无法正确加载。

### 解决方案
已在 `electron/package.json` 中添加 `"asar": false` 配置，禁用 asar 打包。

### 重新构建
```powershell
.\rebuild.ps1
```

---

## 问题 2: 后端无法启动

### 检查步骤

1. **查看日志文件**
   ```
   %APPDATA%\to-docx-desktop\app.log
   ```

2. **检查必需文件**
   打开安装目录，确认以下文件存在：
   ```
   D:\Applications\To-Docx\resources\
   ├── backend\
   │   ├── to-docx-backend.exe  ← 必需
   │   └── .env                  ← 必需
   └── frontend\
       └── index.html            ← 必需
   ```

3. **检查配置文件**
   打开 `resources\backend\.env`，确认配置正确：
   ```
   DASHSCOPE_API_KEY=你的API密钥
   ```

---

## 问题 3: 前端页面无法加载

### 检查步骤

1. **确认前端已构建**
   ```powershell
   cd frontend
   pnpm build:h5
   ```

2. **检查 dist 目录**
   确保 `frontend/dist/index.html` 存在

3. **查看 Electron 日志**
   在 `app.log` 中查找 "Loading frontend from" 相关信息

---

## 完整重新构建流程

```powershell
# 1. 清理所有旧文件
.\rebuild.ps1

# 2. 安装生成的 exe
# 双击 electron\dist\To-Docx Setup 1.0.0.exe

# 3. 运行应用
# 从桌面快捷方式或开始菜单启动

# 4. 如果仍有问题，查看日志
notepad %APPDATA%\to-docx-desktop\app.log
```

---

## 配置 API Key

安装后首次运行，需要配置 DashScope API Key：

1. 找到安装目录（通常是 `C:\Users\你的用户名\AppData\Local\Programs\to-docx-desktop\`）
2. 导航到 `resources\backend\.env`
3. 编辑文件，填入你的 API Key：
   ```
   DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx
   ```
4. 保存并重启应用

---

## 获取 DashScope API Key

1. 访问：https://dashscope.console.aliyun.com/
2. 登录阿里云账号
3. 进入"API-KEY管理"
4. 创建新的 API Key
5. 复制 API Key 到配置文件

---

## 开发模式调试

如果安装包有问题，可以使用开发模式进行调试：

```powershell
# 启动开发环境
.\dev.ps1

# 查看三个窗口的输出：
# - Backend: Python 后端日志
# - Frontend: Taro 开发服务器
# - Electron: Electron 应用窗口（带 DevTools）
```

---

## 常见错误代码

| 错误信息 | 可能原因 | 解决方案 |
|---------|---------|---------|
| Cannot find module | asar 打包问题 | 运行 `.\rebuild.ps1` |
| Backend exe not found | 后端未打包 | 检查 `backend\dist\to-docx-backend.exe` |
| Frontend not found | 前端未构建 | 运行 `cd frontend && pnpm build:h5` |
| Python process exited with code 1 | 配置错误或依赖缺失 | 检查 `.env` 文件和 Python 依赖 |
| Health check failed | 后端启动超时 | 增加等待时间或检查端口占用 |

---

## 联系支持

如果以上方法都无法解决问题，请：

1. 收集 `app.log` 日志文件
2. 提供错误截图
3. 说明操作系统版本和安装路径
4. 提交 Issue 或联系开发者

