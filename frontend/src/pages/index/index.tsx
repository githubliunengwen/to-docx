/**
 * 文件转换页面 - 高级设计版
 */
import { useState, useEffect } from 'react';
import { View, Text, Button, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../utils/api';
import {
  ConvertTutorial,
  ConvertResultTutorial,
  MindmapTutorial,
  SettingsTutorial,
  TutorialProvider,
  useTutorial
} from '../../components/TourGuide';
import './index-premium.scss';

interface FileInfo {
  path: string;
  name: string;
  type: string;
}

type TabType = 'convert' | 'mindmap' | 'settings';

// 配置存储 key
const CONFIG_KEYS = {
  DOCX_OUTPUT_PATH: 'docx_output_path',
  MD_OUTPUT_PATH: 'md_output_path'
};

// 获取默认路径（用户文档目录下的 ToDocx 文件夹）
const getDefaultPath = async (subdir: string) => {
  if (typeof window !== 'undefined' && window.electronAPI?.getUserPath) {
    try {
      const documentsPath = await window.electronAPI.getUserPath('documents');
      const separator = window.electronAPI.platform === 'win32' ? '\\' : '/';
      return `${documentsPath}${separator}ToDocx${separator}${subdir}`;
    } catch (error) {
      console.error('Error getting user path:', error);
    }
  }
  // 降级方案
  if (window.electronAPI?.platform === 'win32') {
    return `C:\\Users\\Public\\Documents\\ToDocx\\${subdir}`;
  } else {
    return `~/Documents/ToDocx/${subdir}`;
  }
};

const Index = () => {
  return (
    <TutorialProvider>
      <IndexContent />
    </TutorialProvider>
  );
};

const IndexContent = () => {
  const { startTutorial } = useTutorial();
  const [activeTab, setActiveTab] = useState<TabType>('convert');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // 思维导图相关
  const [mindmapText, setMindmapText] = useState('');
  const [generatingMindmap, setGeneratingMindmap] = useState(false);
  const [lastMindmapPath, setLastMindmapPath] = useState<string | null>(null);

  // 设置相关 - 初始值为空，从 localStorage 或默认值加载
  const [docxOutputPath, setDocxOutputPath] = useState('');
  const [mdOutputPath, setMdOutputPath] = useState('');

  // 初始化路径配置
  useEffect(() => {
    const initPaths = async () => {
      // 从 localStorage 读取或获取默认值
      const savedDocxPath = localStorage.getItem(CONFIG_KEYS.DOCX_OUTPUT_PATH);
      const savedMdPath = localStorage.getItem(CONFIG_KEYS.MD_OUTPUT_PATH);

      if (savedDocxPath) {
        setDocxOutputPath(savedDocxPath);
      } else {
        const defaultPath = await getDefaultPath('docx');
        setDocxOutputPath(defaultPath);
      }

      if (savedMdPath) {
        setMdOutputPath(savedMdPath);
      } else {
        const defaultPath = await getDefaultPath('md');
        setMdOutputPath(defaultPath);
      }
    };

    initPaths();
  }, []);

  // 页面进入时显示教程
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenConvertTutorial');
    if (!hasSeenTutorial) {
      setTimeout(() => {
        startTutorial('convert');
        localStorage.setItem('hasSeenConvertTutorial', 'true');
      }, 1000);
    }
  }, [startTutorial]);

  // 保存配置到 localStorage
  useEffect(() => {
    if (docxOutputPath) {
      localStorage.setItem(CONFIG_KEYS.DOCX_OUTPUT_PATH, docxOutputPath);
    }
  }, [docxOutputPath]);

  useEffect(() => {
    if (mdOutputPath) {
      localStorage.setItem(CONFIG_KEYS.MD_OUTPUT_PATH, mdOutputPath);
    }
  }, [mdOutputPath]);

  // 获取文件图标
  const getFileIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      'epub': '📖',
      'mp3': '🎵',
      'wav': '🎵',
      'm4a': '🎵',
      'aac': '🎵',
      'mp4': '🎬',
      'avi': '🎬',
      'mov': '🎬'
    };
    return iconMap[type] || '📁';
  };

  // 选择文件
  const handleSelectFile = async () => {
    try {
      if (!window.electronAPI) {
        Taro.showToast({ title: '请在桌面应用中使用', icon: 'none' });
        return;
      }

      const filePath = await window.electronAPI.selectFile({
        filters: [
          {
            name: '支持的文件',
            extensions: ['mp3', 'MP3', 'wav', 'WAV', 'm4a', 'M4A','aac', 'AAC',  'mp4', 'MP4', 'avi', 'AVI', 'mov', 'MOV', 'epub', 'EPUB']
          },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (filePath && typeof filePath === 'string') {
        const fileName = filePath.split(/[/\\]/).pop() || '';
        const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

        setSelectedFile({
          path: filePath,
          name: fileName,
          type: fileExt
        });
        setResult(null);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      Taro.showToast({ title: '选择文件失败', icon: 'none' });
    }
  };

  // 开始转换
  const handleConvert = async () => {
    if (!selectedFile) {
      Taro.showToast({ title: '请先选择文件', icon: 'none' });
      return;
    }

    try {
      setConverting(true);
      Taro.showLoading({ title: '转换中...' });

      const response = await api.convertFile({
        file_path: selectedFile.path,
        output_format: 'docx',
        output_dir: docxOutputPath || undefined, // 传递自定义输出目录
      });

      if (response.success) {
        setResult(response.output_file || '');
        Taro.showToast({ title: '转换成功！', icon: 'success' });

        // 只在第一次转换成功时显示结果教程
        const hasSeenResultTutorial = localStorage.getItem('hasSeenResultTutorial');
        if (!hasSeenResultTutorial) {
          setTimeout(() => {
            startTutorial('result');
            localStorage.setItem('hasSeenResultTutorial', 'true');
          }, 1500);
        }
      } else {
        throw new Error(response.message || '转换失败');
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      const errorMessage = error.message || '转换失败';

      // 先隐藏 loading，避免覆盖错误提示
      Taro.hideLoading();
      setConverting(false);

      // 如果是额度相关错误，使用弹窗显示
      if (errorMessage.includes('额度') || errorMessage.includes('密钥') || errorMessage.includes('quota')) {
        Taro.showModal({
          title: '提示',
          content: errorMessage,
          showCancel: false,
          confirmText: '确定'
        });
      } else {
        // 使用弹窗显示完整错误信息，确保用户能看清
        Taro.showModal({
          title: '转换失败',
          content: errorMessage,
          showCancel: false,
          confirmText: '确定'
        });
      }
    } finally {
      setConverting(false);
      Taro.hideLoading();
    }
  };

  // 打开输出文件
  const handleOpenFile = async () => {
    if (!result || !window.electronAPI) return;
    try {
      await window.electronAPI.openPath(result);
    } catch (error) {
      console.error('Error opening file:', error);
      Taro.showToast({ title: '打开文件失败', icon: 'none' });
    }
  };

  // 在文件夹中显示
  const handleShowInFolder = async () => {
    if (!result || !window.electronAPI) return;
    try {
      await window.electronAPI.showItemInFolder(result);
    } catch (error) {
      console.error('Error showing in folder:', error);
      Taro.showToast({ title: '打开文件夹失败', icon: 'none' });
    }
  };



  // 生成思维导图
  const handleGenerateMindmap = async () => {
    if (!mindmapText.trim()) {
      Taro.showToast({ title: '请输入文本内容', icon: 'none' });
      return;
    }

    try {
      setGeneratingMindmap(true);
      Taro.showLoading({ title: '生成中...' });

      // 提取第一行作为文件名
      const firstLine = mindmapText.split('\n')[0].trim();
      // 移除开头的Markdown标题符号（#）
      const titleText = firstLine.replace(/^#+\s*/, '');
      // 清理文件名中的非法字符
      const cleanTitle = titleText.replace(/[/\\:*?"<>|]/g, '_');
      // 如果第一行为空或太短，使用时间戳
      const fileName = (cleanTitle && cleanTitle.length > 0)
        ? `${cleanTitle}.md`
        : `mindmap_${new Date().getTime()}.md`;

      // 使用平台相关的路径分隔符
      const separator = window.electronAPI?.platform === 'win32' ? '\\' : '/';
      const fullPath = `${mdOutputPath}${separator}${fileName}`;

      console.log('Saving mindmap to:', fullPath);

      if (window.electronAPI && window.electronAPI.saveTextFile) {
        const result = await window.electronAPI.saveTextFile({
          content: mindmapText,
          defaultPath: fullPath
        });

        console.log('Save result:', result);

        if (result.success) {
          // 先隐藏 loading
          Taro.hideLoading();

          // 保存文件路径
          setLastMindmapPath(result.filePath || fullPath);

          // 显示成功提示
          Taro.showToast({
            title: '生成成功！',
            icon: 'success',
            duration: 2000
          });

          setMindmapText('');
          console.log('Mindmap saved successfully:', result.filePath);

          // 不在 finally 中再次 hideLoading
          setGeneratingMindmap(false);
          return;
        } else {
          throw new Error(result.error || '保存失败');
        }
      } else {
        throw new Error('保存功能不可用');
      }
    } catch (error: any) {
      console.error('Generate mindmap error:', error);
      // 先隐藏 loading，避免覆盖错误提示
      Taro.hideLoading();
      setGeneratingMindmap(false);

      const errorMessage = error.message || '生成失败';

      // 使用弹窗显示完整错误信息，确保用户能看清
      Taro.showModal({
        title: '生成失败',
        content: errorMessage,
        showCancel: false,
        confirmText: '确定'
      });
    }
  };

  // 在文件夹中显示思维导图
  const handleShowMindmapFolder = async () => {
    if (!lastMindmapPath) {
      Taro.showToast({ title: '请先生成思维导图', icon: 'none' });
      return;
    }

    if (!window.electronAPI) {
      Taro.showToast({ title: '功能不可用', icon: 'none' });
      return;
    }

    try {
      await window.electronAPI.showItemInFolder(lastMindmapPath);
    } catch (error) {
      console.error('Error showing in folder:', error);
      Taro.showToast({ title: '打开文件夹失败', icon: 'none' });
    }
  };

  // 选择输出路径
  const handleSelectOutputPath = async (type: 'docx' | 'md') => {
    try {
      if (!window.electronAPI || !window.electronAPI.selectDirectory) {
        Taro.showToast({ title: '请在桌面应用中使用', icon: 'none' });
        return;
      }

      const dirPath = await window.electronAPI.selectDirectory();

      if (dirPath && typeof dirPath === 'string') {
        if (type === 'docx') {
          setDocxOutputPath(dirPath);
        } else {
          setMdOutputPath(dirPath);
        }
        Taro.showToast({ title: '路径设置成功', icon: 'success' });
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      Taro.showToast({ title: '选择路径失败', icon: 'none' });
    }
  };

  // 教程处理函数
  const handleStartTutorial = () => {
    // 根据当前页面状态和 tab 显示对应教程
    if (activeTab === 'convert') {
      // 如果已经有转换结果，显示结果教程；否则显示转换教程
      if (result) {
        startTutorial('result');
      } else {
        startTutorial('convert');
      }
    } else if (activeTab === 'mindmap') {
      startTutorial('mindmap');
    } else if (activeTab === 'settings') {
      startTutorial('settings');
    }
  };

  // Tab切换时显示对应教程
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    // 检查是否需要显示教程
    if (tab === 'mindmap') {
      const hasSeenMindmapTutorial = localStorage.getItem('hasSeenMindmapTutorial');
      if (!hasSeenMindmapTutorial) {
        setTimeout(() => {
          startTutorial('mindmap');
          localStorage.setItem('hasSeenMindmapTutorial', 'true');
        }, 500);
      }
    } else if (tab === 'settings') {
      const hasSeenSettingsTutorial = localStorage.getItem('hasSeenSettingsTutorial');
      if (!hasSeenSettingsTutorial) {
        setTimeout(() => {
          startTutorial('settings');
          localStorage.setItem('hasSeenSettingsTutorial', 'true');
        }, 500);
      }
    }
  };

  return (
    <View className="premium-container">
      {/* 左侧导航 */}
      <View className="premium-sidebar">
        <View className="sidebar-header">
          <Text className="app-title">AI拆书拆课神器</Text>
          <Button
            className="help-btn"
            onClick={handleStartTutorial}
            style="background: transparent; border: 1px solid #228be6; color: #228be6; font-size: 12px; padding: 4px 8px; margin-top: 8px;"
          >
            ❓ 提示
          </Button>
        </View>
        <View className="sidebar-tabs">
          <View
            className={`sidebar-tab-item ${activeTab === 'convert' ? 'active' : ''}`}
            onClick={() => handleTabChange('convert')}
          >
            <Text className="tab-icon">🔄</Text>
            <Text className="tab-text">格式转换</Text>
          </View>
          <View
            className={`sidebar-tab-item ${activeTab === 'mindmap' ? 'active' : ''}`}
            onClick={() => handleTabChange('mindmap')}
          >
            <Text className="tab-icon">🧠</Text>
            <Text className="tab-text">生成思维导图</Text>
          </View>
          <View
            className={`sidebar-tab-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <Text className="tab-icon">⚙️</Text>
            <Text className="tab-text">设置</Text>
          </View>
        </View>
      </View>

      {/* 主内容区 */}
      <View className="premium-content">
        {/* 格式转换 Tab */}
        {activeTab === 'convert' && (
          <View className="convert-panel">
            <View className="panel-header">
              <View className="title-wrapper">
                <Text className="panel-title">文件格式转换</Text>
              </View>
              <View className="subtitle-wrapper">
                <Text className="panel-subtitle">支持 EPUB 电子书、音频、视频文件转 DOCX</Text>
              </View>
            </View>

            {/* 付费提示 */}
            <View className="panel-notice">
              <Text className="notice-text">
                📖 EPUB电子书正常使用，音频/视频转成文档docx需要另外付费开通，如需开通请联系推荐人咨询
              </Text>
            </View>

            {/* 文件选择区 */}
            <View className="file-selection-area">
              {!selectedFile ? (
                <View className="empty-state" onClick={handleSelectFile}>
                  <Text className="empty-icon">📁</Text>
                  <Text className="empty-title">选择要转换的文件</Text>
                  <Text className="empty-hint">支持 EPUB 电子书、音频文件（MP3、WAV、M4A、AAC）、视频文件（MP4、AVI、MOV）</Text>
                  <Button className="btn-select-large">选择文件</Button>
                </View>
              ) : (
                <View className="file-card">
                  <View className="file-info">
                    <Text className="file-icon-large">{getFileIcon(selectedFile.type)}</Text>
                    <View className="file-details">
                      <Text className="file-name">{selectedFile.name}</Text>
                      <Text className="file-type">{selectedFile.type.toUpperCase()} 文件</Text>
                      <Text className="file-path">{selectedFile.path}</Text>
                    </View>
                  </View>
                  <View className="file-actions">
                    <Button className="btn-reselect" onClick={handleSelectFile}>
                      重新选择
                    </Button>
                    <Button
                      className="btn-convert-primary"
                      onClick={handleConvert}
                      disabled={converting}
                    >
                      {converting ? '转换中...' : '开始转换'}
                    </Button>
                  </View>
                </View>
              )}
            </View>

            {/* 转换结果 */}
            {result && (
              <View className="result-card">
                <View className="result-header">
                  <Text className="result-icon">✅</Text>
                  <Text className="result-title">转换成功</Text>
                </View>
                <View className="result-content">
                  <Text className="result-path">{result}</Text>
                </View>
                <View className="result-actions">
                  <Button className="btn-action" onClick={handleOpenFile}>
                    📄 打开文件
                  </Button>
                  <Button className="btn-action" onClick={handleShowInFolder}>
                    📂 在文件夹中显示
                  </Button>
                </View>
              </View>
            )}
          </View>
        )}


        {/* 思维导图 Tab */}
        {activeTab === 'mindmap' && (
          <View className="mindmap-panel">
            <View className="panel-header">
              <Text className="panel-title">生成思维导图</Text>
            </View>

            <View className="mindmap-editor-area">
              <Textarea
                className="mindmap-textarea"
                value={mindmapText}
                onInput={(e) => setMindmapText(e.detail.value)}
                placeholder="请粘贴或输入 Markdown 格式的文本内容...&#10;&#10;示例：&#10;# 主标题&#10;## 二级标题&#10;- 要点 1&#10;- 要点 2&#10;  - 子要点 2.1&#10;  - 子要点 2.2"
                maxlength={-1}
                autoHeight={false}
                style="height: 320px; min-height: 320px;"
              />

              <View className="editor-info">
                <Text className="char-count">{mindmapText.length} 字符</Text>
                <Text className="editor-hint">支持多级标题和列表结构</Text>
              </View>
            </View>

            <View className="mindmap-actions">
              <Button
                className="btn-clear"
                onClick={() => setMindmapText('')}
                disabled={!mindmapText.trim()}
              >
                清空内容
              </Button>
              <Button
                className="btn-generate-mindmap"
                onClick={handleGenerateMindmap}
                disabled={generatingMindmap || !mindmapText.trim()}
              >
                {generatingMindmap ? '生成中...' : '生成思维导图'}
              </Button>
              <Button className="btn-action" onClick={handleShowMindmapFolder}
                 disabled={!lastMindmapPath} >
                    📂 在文件夹中显示
                  </Button>
            </View>


          </View>
        )}

        {/* 设置 Tab */}
        {activeTab === 'settings' && (
          <View className="settings-panel">
            <View className="panel-header">
              <Text className="panel-title">输出设置</Text>
              <Text className="panel-subtitle">配置文件的输出路径</Text>
            </View>

            <View className="settings-list">
              <View className="setting-item">
                <View className="setting-header">
                  <Text className="setting-icon">🔐</Text>
                  <View className="setting-info">
                    <Text className="setting-title">软件激活</Text>
                    <Text className="setting-desc">查看激活状态或激活软件</Text>
                  </View>
                </View>
                <View className="setting-content">
                  <Button
                    className="btn-change-path"
                    onClick={() => Taro.navigateTo({ url: '/pages/activation/index?view=true' })}
                  >
                    激活管理
                  </Button>
                </View>
              </View>

              <View className="setting-item">
                <View className="setting-header">
                  <Text className="setting-icon">📄</Text>
                  <View className="setting-info">
                    <Text className="setting-title">DOCX 文件输出路径</Text>
                    <Text className="setting-desc">转换后的 Word 文档保存位置</Text>
                  </View>
                </View>
                <View className="setting-content">
                  <Text className="path-display">{docxOutputPath}</Text>
                  <Button
                    className="btn-change-path"
                    onClick={() => handleSelectOutputPath('docx')}
                  >
                    更改路径
                  </Button>
                </View>
              </View>

              <View className="setting-item">
                <View className="setting-header">
                  <Text className="setting-icon">📝</Text>
                  <View className="setting-info">
                    <Text className="setting-title">Markdown 文件输出路径</Text>
                    <Text className="setting-desc">思维导图文件保存位置</Text>
                  </View>
                </View>
                <View className="setting-content">
                  <Text className="path-display">{mdOutputPath}</Text>
                  <Button
                    className="btn-change-path"
                    onClick={() => handleSelectOutputPath('md')}
                  >
                    更改路径
                  </Button>
                </View>
              </View>
            </View>

            <View className="settings-footer">
              <Text className="footer-text">所有更改将立即生效</Text>
            </View>
          </View>
        )}
      </View>

      {/* 教程组件 */}
      <ConvertTutorial />
      <ConvertResultTutorial />
      <MindmapTutorial />
      <SettingsTutorial />
    </View>
  );
};

export default Index;
