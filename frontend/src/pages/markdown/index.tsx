/**
 * Markdown工具页面 - 格式转换 & 思维导图
 */
import { useState, useEffect } from 'react';
import { View, Text, Textarea, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../utils/api';
import { MindmapTutorial, TutorialProvider, useTutorial } from '../../components/TourGuide';
import './index.scss';

const Markdown = () => {
  return (
    <TutorialProvider>
      <MarkdownContent />
    </TutorialProvider>
  );
};

const MarkdownContent = () => {
  const { startTutorial } = useTutorial();
  const [activeTab, setActiveTab] = useState<'convert' | 'mindmap'>('convert');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // 页面进入时显示教程
  useEffect(() => {
    const hasSeenMarkdownTutorial = localStorage.getItem('hasSeenMarkdownTutorial');
    if (!hasSeenMarkdownTutorial) {
      setTimeout(() => {
        startTutorial('mindmap');
        localStorage.setItem('hasSeenMarkdownTutorial', 'true');
      }, 1000);
    }
  }, [startTutorial]);

  // 格式转换
  const handleConvert = async () => {
    if (!inputText.trim()) {
      Taro.showToast({ title: '请输入Markdown内容', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      Taro.showLoading({ title: '转换中...' });

      // 调用API转换
      const response = await api.convertMarkdown({
        content: inputText,
        output_format: 'docx'
      });

      if (response.success) {
        setResult(response.output_file || '');
        Taro.showToast({ title: '转换成功！', icon: 'success' });
      } else {
        throw new Error(response.message || '转换失败');
      }
    } catch (error: any) {
      console.error('Convert error:', error);
      Taro.showToast({
        title: error.message || '转换失败',
        icon: 'none',
        duration: 3000
      });
    } finally {
      setLoading(false);
      Taro.hideLoading();
    }
  };

  // 生成思维导图
  const handleGenerateMindmap = async () => {
    if (!inputText.trim()) {
      Taro.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      Taro.showLoading({ title: '生成中...' });

      // 调用API生成思维导图
      const response = await api.generateMindmap({
        content: inputText
      });

      if (response.success) {
        setResult(response.mindmap_url || response.output_file || '');
        Taro.showToast({ title: '生成成功！', icon: 'success' });
      } else {
        throw new Error(response.message || '生成失败');
      }
    } catch (error: any) {
      console.error('Generate mindmap error:', error);
      Taro.showToast({
        title: error.message || '生成失败',
        icon: 'none',
        duration: 3000
      });
    } finally {
      setLoading(false);
      Taro.hideLoading();
    }
  };

  // 教程处理函数
  const handleStartTutorial = () => {
    startTutorial('mindmap');
  };

  return (
    <View className="markdown-page">
      {/* 头部 */}
      <View className="page-header">
        <View className="header-icon">📝</View>
        <Text className="header-title">Markdown工具</Text>
        <Text className="header-subtitle">格式转换与思维导图生成</Text>
        <Button
          className="help-btn"
          onClick={handleStartTutorial}
          style="background: transparent; border: 1px solid #228be6; color: #228be6; font-size: 12px; padding: 4px 8px; margin-left: auto;"
        >
          ❓ 提示
        </Button>
      </View>

      {/* Tab切换 */}
      <View className="tab-bar">
        <View
          className={`tab-item ${activeTab === 'convert' ? 'active' : ''}`}
          onClick={() => setActiveTab('convert')}
        >
          <Text>格式转换</Text>
        </View>
        <View
          className={`tab-item ${activeTab === 'mindmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('mindmap')}
        >
          <Text>生成思维导图</Text>
        </View>
      </View>

      {/* 主内容区 */}
      <View className="page-content">
        {activeTab === 'convert' ? (
          // 格式转换Tab
          <View className="convert-section">
            <View className="input-section">
              <Text className="section-title">Markdown内容</Text>
              <Textarea
                className="input-textarea"
                placeholder="请输入Markdown格式的内容..."
                value={inputText}
                onInput={(e) => setInputText(e.detail.value)}
                maxlength={-1}
              />
            </View>

            <Button
              className="action-button primary"
              onClick={handleConvert}
              disabled={loading || !inputText.trim()}
            >
              {loading ? '转换中...' : '转换为DOCX'}
            </Button>

            {result && (
              <View className="result-section">
                <Text className="result-title">✅ 转换成功</Text>
                <Text className="result-path">{result}</Text>
                <Button
                  className="action-button secondary"
                  onClick={() => {
                    if (window.electronAPI) {
                      window.electronAPI.openPath(result);
                    }
                  }}
                >
                  打开文件
                </Button>
              </View>
            )}
          </View>
        ) : (
          // 生成思维导图Tab
          <View className="mindmap-section">
            <View className="input-section">
              <Text className="section-title">输入内容</Text>
              <Textarea
                className="input-textarea"
                placeholder="请输入要生成思维导图的内容..."
                value={inputText}
                onInput={(e) => setInputText(e.detail.value)}
                maxlength={-1}
              />
            </View>

            <Button
              className="action-button primary"
              onClick={handleGenerateMindmap}
              disabled={loading || !inputText.trim()}
            >
              {loading ? '生成中...' : '生成思维导图'}
            </Button>

            {result && (
              <View className="result-section">
                <Text className="result-title">✅ 生成成功</Text>
                <Text className="result-path">{result}</Text>
                <Button
                  className="action-button secondary"
                  onClick={() => {
                    if (window.electronAPI) {
                      window.electronAPI.openPath(result);
                    }
                  }}
                >
                  查看思维导图
                </Button>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 教程组件 */}
      <MindmapTutorial />
    </View>
  );
};

export default Markdown;
