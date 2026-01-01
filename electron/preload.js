const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取后端 URL
  getPythonUrl: () => ipcRenderer.invoke('get-backend-url'),

  // 文件选择
  selectFile: (options) => ipcRenderer.invoke('select-file', options),

  // 文件夹选择
  selectDirectory: (options) => ipcRenderer.invoke('select-directory', options),

  // 保存文件对话框
  saveFile: (options) => ipcRenderer.invoke('save-file', options),

  // 保存文本文件（直接保存，不弹窗）
  saveTextFile: (options) => ipcRenderer.invoke('save-text-file', options),

  // 在文件夹中显示文件
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),

  // 打开文件或目录
  openPath: (path) => ipcRenderer.invoke('open-path', path),

  // 获取用户目录路径
  getUserPath: (name) => ipcRenderer.invoke('get-user-path', name),

  // 平台信息
  platform: process.platform,

  // 版本信息
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});
