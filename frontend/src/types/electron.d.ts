/**
 * Electron API 类型定义
 */

interface FileFilter {
  name: string;
  extensions: string[];
}

interface SelectFileOptions {
  filters?: FileFilter[];
}

interface SaveTextFileOptions {
  content: string;
  defaultPath?: string;
}

interface SaveTextFileResult {
  success: boolean;
  filePath?: string;
  message?: string;
  error?: string;
}

interface ElectronAPI {
  // File dialogs
  selectFile: (options: SelectFileOptions) => Promise<string | undefined>;
  selectFiles: (options: SelectFileOptions) => Promise<string[] | undefined>;
  selectDirectory: () => Promise<string | undefined>;
  showMessage: (options: any) => Promise<any>;

  // File operations
  saveTextFile: (options: SaveTextFileOptions) => Promise<SaveTextFileResult>;

  // Python backend
  getPythonUrl: () => Promise<string>;
  checkPythonStatus: () => Promise<boolean>;

  // Shell operations
  openPath: (filePath: string) => Promise<void>;
  showItemInFolder: (filePath: string) => Promise<void>;

  // System paths
  getUserPath: (name: string) => Promise<string>;

  // Platform info
  platform: string;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
