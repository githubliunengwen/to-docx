const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');

// 设置日志文件
const logPath = path.join(app.getPath('userData'), 'app.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
}

function logError(message, error) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ERROR: ${message}\n${error ? error.stack || error : ''}\n`;
  console.error(message, error);
  logStream.write(logMessage);
}

let mainWindow;
let pythonProcess;
const PYTHON_PORT = 8765;
const isDev = process.argv.includes('--dev');

// Python 进程管理
const PythonBridge = {
  process: null,

  start() {
    return new Promise((resolve, reject) => {
      let backendExe, backendCwd;

      if (isDev) {
        // 开发模式：使用虚拟环境中的 Python
        const pythonPath = path.join(__dirname, '../backend/venv/Scripts/python.exe');
        const scriptPath = path.join(__dirname, '../backend/main.py');
        backendCwd = path.join(__dirname, '../backend');

        log('Starting Python backend in DEV mode...');
        log(`Python: ${pythonPath}`);
        log(`Script: ${scriptPath}`);
        log(`CWD: ${backendCwd}`);

        // 检查文件是否存在
        if (!fs.existsSync(pythonPath)) {
          const error = `Python not found at: ${pythonPath}`;
          logError(error);
          reject(new Error(error));
          return;
        }
        if (!fs.existsSync(scriptPath)) {
          const error = `Script not found at: ${scriptPath}`;
          logError(error);
          reject(new Error(error));
          return;
        }

        this.process = spawn(pythonPath, [scriptPath], { cwd: backendCwd });
      } else {
        // 生产模式：使用打包的 exe
        backendExe = path.join(process.resourcesPath, 'backend', 'to-docx-backend.exe');
        backendCwd = path.join(process.resourcesPath, 'backend');

        log('Starting Python backend in PRODUCTION mode...');
        log(`Backend exe: ${backendExe}`);
        log(`CWD: ${backendCwd}`);
        log(`Resources path: ${process.resourcesPath}`);

        // 检查文件是否存在
        if (!fs.existsSync(backendExe)) {
          const error = `Backend exe not found at: ${backendExe}`;
          logError(error);
          reject(new Error(error));
          return;
        }

        // 确保用户数据目录中的 temp 目录存在（不在安装目录中创建）
        const userDataPath = app.getPath('userData');
        const tempDir = path.join(userDataPath, 'temp');
        if (!fs.existsSync(tempDir)) {
          log(`Creating temp directory in user data: ${tempDir}`);
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // 设置环境变量，让后端使用用户数据目录的 temp
        const env = { ...process.env, TEMP_DIR: tempDir };
        this.process = spawn(backendExe, [], { cwd: backendCwd, env });
      }

      this.process.stdout.on('data', (data) => {
        log(`Python: ${data}`);
      });

      this.process.stderr.on('data', (data) => {
        logError(`Python Error: ${data}`);
      });

      this.process.on('error', (error) => {
        logError('Failed to start Python process', error);
        reject(error);
      });

      this.process.on('close', (code) => {
        log(`Python process exited with code ${code}`);
        if (code !== 0 && code !== null) {
          reject(new Error(`Python process exited with code ${code}`));
        }
      });

      // 等待服务器启动，增加重试逻辑
      const maxRetries = 10;
      const retryDelay = 1000;
      let retries = 0;

      const waitForBackend = async () => {
        while (retries < maxRetries) {
          try {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            await this.checkHealth();
            log('Python backend is ready!');
            resolve();
            return;
          } catch (error) {
            retries++;
            log(`Health check attempt ${retries}/${maxRetries}...`);
            if (retries >= maxRetries) {
              logError('Backend failed to start after maximum retries', error);
              reject(new Error('Python backend not ready'));
            }
          }
        }
      };

      waitForBackend();
    });
  },

  async checkHealth() {
    try {
      const response = await axios.get(`http://127.0.0.1:${PYTHON_PORT}/api/system/health`, {
        timeout: 2000
      });
      log(`Backend health: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
};

// 创建窗口
function createWindow() {
  log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'AI拆书拆课神器',
    show: false,
    backgroundColor: '#ffffff'
  });

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    log('Window is ready to show');
    mainWindow.show();
  });

  // 加载前端
  const frontendPath = isDev
    ? 'http://localhost:20000'  // 开发模式：Taro 开发服务器
    : `file://${path.join(process.resourcesPath, 'frontend/index.html')}`; // 生产模式

  log(`Loading frontend from: ${frontendPath}`);
  mainWindow.loadURL(frontendPath).catch((error) => {
    logError('Failed to load frontend', error);
  });

  // 开发模式打开 DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建中文菜单
  const menuTemplate = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '查看',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于',
              message: 'AI拆书拆课神器',
              detail: '您想不想拥有点石成金，撒豆成兵的核心超能力？这款AI拆书拆课神器：拆书成课，拆课成兵，一人可抵千军万马，AI时代打造数字员工的必备神器，从内容到变现，提供1套顶尖训练手册，零基础，搭建24小时自动赚钱的AI智能体数字员工矩阵；1个人+1门课+AI工具，开启（一次拆解，终身赚钱）的AI智能体数字员工创业路，详情请咨询推荐人'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// 应用启动
app.whenReady().then(async () => {
  log('=== Application Starting ===');
  log(`Electron version: ${process.versions.electron}`);
  log(`Node version: ${process.versions.node}`);
  log(`Platform: ${process.platform}`);
  log(`User data path: ${app.getPath('userData')}`);
  log(`Resources path: ${process.resourcesPath}`);

  try {
    // 启动 Python 后端
    log('Starting Python backend...');
    await PythonBridge.start();
    log('Python backend started successfully');

    // 创建窗口
    log('Creating window...');
    createWindow();
    log('Window created successfully');
  } catch (error) {
    logError('Failed to start application', error);
    // 显示错误对话框
    const { dialog } = require('electron');
    dialog.showErrorBox('启动失败', `应用启动失败：${error.message}\n\n请查看日志文件：${logPath}`);
    app.quit();
  }
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出时停止 Python
app.on('quit', () => {
  PythonBridge.stop();
});

// macOS 激活
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC 通信
ipcMain.handle('get-backend-url', () => {
  return `http://127.0.0.1:${PYTHON_PORT}`;
});

// 文件选择对话框
ipcMain.handle('select-file', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: options.multiSelections ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: options.filters || [
      { name: 'All Files', extensions: ['*'] }
    ],
    title: options.title || 'Select File'
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }

  // 如果支持多选，返回数组；否则返回单个文件路径
  return options.multiSelections ? result.filePaths : result.filePaths[0];
});

// 文件夹选择对话框
ipcMain.handle('select-directory', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: options.title || 'Select Directory'
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// 保存文件对话框
ipcMain.handle('save-file', async (event, options = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: options.filters || [
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: options.defaultPath || '',
    title: options.title || 'Save File'
  });

  if (result.canceled) {
    return null;
  }

  return result.filePath;
});

// 在文件夹中显示文件
ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  if (!filePath) {
    return;
  }
  shell.showItemInFolder(filePath);
});

// 保存文本文件（直接保存，不弹窗）
ipcMain.handle('save-text-file', async (event, options) => {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    const { content, defaultPath } = options;

    console.log('Saving text file to:', defaultPath);

    // 确保目录存在
    const dir = path.dirname(defaultPath);
    await fs.mkdir(dir, { recursive: true });

    // 获取唯一文件名，避免覆盖现有文件
    const getUniqueFilename = async (filePath) => {
      try {
        await fs.access(filePath);
        // 文件存在，需要生成新的文件名
        const parsedPath = path.parse(filePath);
        let counter = 1;

        while (counter <= 1000) {
          const newName = `${parsedPath.name}(${counter})${parsedPath.ext}`;
          const newPath = path.join(parsedPath.dir, newName);

          try {
            await fs.access(newPath);
            counter++;
          } catch {
            // 文件不存在，可以使用这个文件名
            return newPath;
          }
        }

        // 如果尝试了1000次还没找到，使用时间戳
        const timestamp = Date.now();
        const timestampName = `${parsedPath.name}_${timestamp}${parsedPath.ext}`;
        return path.join(parsedPath.dir, timestampName);
      } catch {
        // 文件不存在，可以直接使用原文件名
        return filePath;
      }
    };

    const finalPath = await getUniqueFilename(defaultPath);

    // 写入文件
    await fs.writeFile(finalPath, content, 'utf-8');

    console.log('Text file saved successfully:', finalPath);
    return { success: true, filePath: finalPath };
  } catch (error) {
    console.error('Error saving text file:', error);
    return { success: false, error: error.message };
  }
});

// 打开文件或目录
ipcMain.handle('open-path', async (event, filePath) => {
  if (!filePath) {
    return;
  }
  await shell.openPath(filePath);
});

// 获取用户目录路径
ipcMain.handle('get-user-path', async (event, name) => {
  return app.getPath(name || 'documents');
});
