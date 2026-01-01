/**
 * 设置页面
 */
import { useState, useEffect } from 'react';
import { View, Text, Button, Input, Checkbox } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../utils/api';
import { SettingsTutorial, TutorialProvider, useTutorial } from '../../components/TourGuide';
import './index.scss';

interface Settings {
  minio_endpoint: string;
  minio_bucket: string;
  minio_secure: boolean;
  dashscope_configured: boolean;
  output_dir: string;
  supported_audio_formats: string[];
  supported_video_formats: string[];
  supported_ebook_formats: string[];
}

const SettingsPage = () => {
  return (
    <TutorialProvider>
      <SettingsContent />
    </TutorialProvider>
  );
};

const SettingsContent = () => {
  const { startTutorial } = useTutorial();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 表单数据
  const [minioEndpoint, setMinioEndpoint] = useState('');
  const [minioAccessKey, setMinioAccessKey] = useState('');
  const [minioSecretKey, setMinioSecretKey] = useState('');
  const [minioBucket, setMinioBucket] = useState('');
  const [minioSecure, setMinioSecure] = useState(false);
  const [dashscopeApiKey, setDashscopeApiKey] = useState('');
  const [outputDir, setOutputDir] = useState('');

  // 健康状态
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // 加载设置
  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);

      // 填充表单
      setMinioEndpoint(data.minio_endpoint);
      setMinioBucket(data.minio_bucket);
      setMinioSecure(data.minio_secure);
      setOutputDir(data.output_dir);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      Taro.showToast({ title: '加载设置失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  // 检查健康状态
  const checkHealth = async () => {
    try {
      const health = await api.healthCheck();
      setHealthStatus(health);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus(null);
    }
  };

  useEffect(() => {
    loadSettings();
    checkHealth();

    // 页面进入时显示教程
    const hasSeenSettingsTutorial = localStorage.getItem('hasSeenSettingsTutorial');
    if (!hasSeenSettingsTutorial) {
      setTimeout(() => {
        startTutorial('settings');
        localStorage.setItem('hasSeenSettingsTutorial', 'true');
      }, 1000);
    }
  }, [startTutorial]);

  // 保存设置
  const handleSave = async () => {
    try {
      setSaving(true);
      Taro.showLoading({ title: '保存中...' });

      const updateData: any = {};

      if (minioEndpoint) updateData.minio_endpoint = minioEndpoint;
      if (minioAccessKey) updateData.minio_access_key = minioAccessKey;
      if (minioSecretKey) updateData.minio_secret_key = minioSecretKey;
      if (minioBucket) updateData.minio_bucket = minioBucket;
      updateData.minio_secure = minioSecure;
      if (dashscopeApiKey) updateData.dashscope_api_key = dashscopeApiKey;
      if (outputDir) updateData.output_dir = outputDir;

      await api.updateSettings(updateData);

      Taro.showToast({ title: '保存成功', icon: 'success' });

      // 重新加载设置
      await loadSettings();
      await checkHealth();

      // 清空密钥输入框
      setMinioAccessKey('');
      setMinioSecretKey('');
      setDashscopeApiKey('');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      Taro.showToast({
        title: error.message || '保存失败',
        icon: 'none',
        duration: 3000
      });
    } finally {
      setSaving(false);
      Taro.hideLoading();
    }
  };

  // 选择输出目录
  const handleSelectOutputDir = async () => {
    if (!window.electronAPI) {
      Taro.showToast({ title: '请在桌面应用中使用', icon: 'none' });
      return;
    }

    try {
      const dir = await window.electronAPI.selectDirectory();
      if (dir) {
        setOutputDir(dir);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      Taro.showToast({ title: '选择目录失败', icon: 'none' });
    }
  };

  // 打开输出目录
  const handleOpenOutputDir = async () => {
    if (!window.electronAPI || !outputDir) return;

    try {
      await window.electronAPI.openPath(outputDir);
    } catch (error) {
      console.error('Error opening directory:', error);
      Taro.showToast({ title: '打开目录失败', icon: 'none' });
    }
  };

  // 教程处理函数
  const handleStartTutorial = () => {
    startTutorial('settings');
  };

  if (loading) {
    return (
      <View className="settings-page">
        <View className="loading">
          <Text>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="settings-page">
      <View className="header">
        <Text className="title">设置</Text>
        <Text className="subtitle">配置应用参数</Text>
        <Button
          className="help-btn"
          onClick={handleStartTutorial}
          style="background: transparent; border: 1px solid #228be6; color: #228be6; font-size: 12px; padding: 4px 8px; margin-left: auto;"
        >
          ❓ 提示
        </Button>
      </View>

      <View className="content">
        {/* 健康状态 */}
        {healthStatus && (
          <View className="status-card">
            <View className="status-header">
              <Text className="status-title">🏥 系统状态</Text>
              <Text className={`status-badge ${healthStatus.status === 'healthy' ? 'success' : 'error'}`}>
                {healthStatus.status === 'healthy' ? '正常' : '异常'}
              </Text>
            </View>
            <View className="status-items">
              <View className="status-item">
                <Text className="item-label">应用版本</Text>
                <Text className="item-value">{healthStatus.version}</Text>
              </View>
              <View className="status-item">
                <Text className="item-label">MinIO连接</Text>
                <Text className={`item-value ${healthStatus.minio_connected ? 'success' : 'error'}`}>
                  {healthStatus.minio_connected ? '✅ 已连接' : '❌ 未连接'}
                </Text>
              </View>
              <View className="status-item">
                <Text className="item-label">语音识别</Text>
                <Text className={`item-value ${healthStatus.dashscope_configured ? 'success' : 'error'}`}>
                  {healthStatus.dashscope_configured ? '✅ 已配置' : '❌ 未配置'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* MinIO 配置 */}
        <View className="section">
          <Text className="section-title">📦 MinIO 存储配置</Text>

          <View className="form-item">
            <Text className="label">服务器地址</Text>
            <Input
              className="input"
              type="text"
              value={minioEndpoint}
              onInput={(e) => setMinioEndpoint(e.detail.value)}
              placeholder="例如: localhost:9000"
            />
          </View>

          <View className="form-item">
            <Text className="label">Access Key</Text>
            <Input
              className="input"
              type="text"
              value={minioAccessKey}
              onInput={(e) => setMinioAccessKey(e.detail.value)}
              placeholder="输入后保存，不会显示当前值"
            />
          </View>

          <View className="form-item">
            <Text className="label">Secret Key</Text>
            <Input
              className="input"
              type="text"
              password
              value={minioSecretKey}
              onInput={(e) => setMinioSecretKey(e.detail.value)}
              placeholder="输入后保存，不会显示当前值"
            />
          </View>

          <View className="form-item">
            <Text className="label">Bucket 名称</Text>
            <Input
              className="input"
              type="text"
              value={minioBucket}
              onInput={(e) => setMinioBucket(e.detail.value)}
              placeholder="例如: to-docx"
            />
          </View>

          <View className="form-item">
            <View className="checkbox-wrapper">
              <Checkbox
                value="secure"
                checked={minioSecure}
                onChange={(e) => setMinioSecure(e.detail.value.indexOf('secure') >= 0)}
              />
              <Text className="checkbox-label">使用 HTTPS</Text>
            </View>
          </View>
        </View>

        {/* 阿里云配置 */}
        <View className="section">
          <Text className="section-title">🎙️ 阿里云语音识别配置</Text>

          <View className="form-item">
            <Text className="label">DashScope API Key</Text>
            <Input
              className="input"
              type="text"
              password
              value={dashscopeApiKey}
              onInput={(e) => setDashscopeApiKey(e.detail.value)}
              placeholder="输入后保存，不会显示当前值"
            />
          </View>
        </View>

        {/* 输出目录 */}
        <View className="section">
          <Text className="section-title">📁 输出目录</Text>

          <View className="form-item">
            <Text className="label">保存路径</Text>
            <View className="dir-selector">
              <Input
                className="input dir-input"
                type="text"
                value={outputDir}
                onInput={(e) => setOutputDir(e.detail.value)}
                placeholder="选择输出目录"
                disabled
              />
              <Button className="select-btn" onClick={handleSelectOutputDir}>
                选择
              </Button>
              {outputDir && (
                <Button className="open-btn" onClick={handleOpenOutputDir}>
                  打开
                </Button>
              )}
            </View>
          </View>
        </View>

        {/* 支持的格式 */}
        {settings && (
          <View className="section">
            <Text className="section-title">📋 支持的文件格式</Text>

            <View className="format-list">
              <View className="format-group">
                <Text className="format-label">音频格式</Text>
                <Text className="format-value">{settings.supported_audio_formats.join(', ')}</Text>
              </View>
              <View className="format-group">
                <Text className="format-label">视频格式</Text>
                <Text className="format-value">{settings.supported_video_formats.join(', ')}</Text>
              </View>
              <View className="format-group">
                <Text className="format-label">电子书格式</Text>
                <Text className="format-value">{settings.supported_ebook_formats.join(', ')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 保存按钮 */}
        <Button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '💾 保存设置'}
        </Button>

        {/* 提示信息 */}
        <View className="tips">
          <Text className="tips-title">💡 提示</Text>
          <Text className="tips-text">• 密钥信息不会在界面显示，每次修改需重新输入</Text>
          <Text className="tips-text">• 设置保存后仅在当前运行时生效</Text>
          <Text className="tips-text">• 重启应用后需重新配置或使用.env文件</Text>
        </View>
      </View>

      {/* 教程组件 */}
      <SettingsTutorial />
    </View>
  );
};

export default SettingsPage;
