import { View, Text, Input, Button } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import WelcomeModal from '../../components/WelcomeModal';
import './index.scss';

// API请求函数
const API_BASE = 'http://localhost:8765';

async function getLicenseStatus() {
  const res = await fetch(`${API_BASE}/api/license/status`);
  return await res.json();
}

async function activateLicense(licenseCode: string) {
  const res = await fetch(`${API_BASE}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_code: licenseCode })
  });
  return await res.json();
}

export default function Activation() {
  const [machineCode, setMachineCode] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activated, setActivated] = useState(false);
  const [expireDate, setExpireDate] = useState('');
  const [isViewMode, setIsViewMode] = useState(false);

  // 欢迎弹窗状态
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  // 加载机器码
  useEffect(() => {
    // 检查是否为查看模式
    const params = Taro.getCurrentInstance().router?.params;
    const viewMode = params?.view === 'true';
    setIsViewMode(viewMode);

    // 如果不是查看模式，检查是否需要显示欢迎弹窗
    if (!viewMode) {
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        setTimeout(() => {
          setIsWelcomeOpen(true);
        }, 1000);
      }
    }

    loadMachineCode(viewMode);
  }, []);

  const loadMachineCode = async (viewMode: boolean) => {
    try {
      const result = await getLicenseStatus();
      setMachineCode(result.machine_code);
      setMessage(result.message);
      setActivated(result.activated);

      if (result.activated && result.expire_date) {
        setExpireDate(result.expire_date);
      }

      // 如果已激活且不是查看模式，自动跳转到转换页面
      if (result.activated && !viewMode) {
        // 使用延迟跳转，确保页面已经渲染
        setTimeout(() => {
          Taro.redirectTo({ url: '/pages/index/index' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to check activation:', err);
      setMessage('获取机器码失败');
    }
  };

  const handleActivate = async () => {
    if (!licenseCode.trim()) {
      Taro.showToast({ title: '请输入激活码', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      const result = await activateLicense(licenseCode);

      if (result.success) {
        // 更新激活状态
        setActivated(true);
        setExpireDate(result.expire_date || '');

        // 激活成功，显示提示信息
        Taro.showModal({
          title: '激活成功',
          content: `激活成功！\n到期日期：${result.expire_date}`,
          showCancel: false,
          success: () => {
            // 如果是查看模式，刷新页面显示新的激活信息
            if (isViewMode) {
              loadMachineCode(true);
            } else {
              // 否则跳转到转换页面
              Taro.redirectTo({ url: '/pages/index/index' });
            }
          }
        });
      } else {
        Taro.showToast({ title: result.message, icon: 'none', duration: 3000 });
      }
    } catch (err) {
      console.error('Activation error:', err);
      Taro.showToast({ title: '激活失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const copyMachineCode = () => {
    Taro.setClipboardData({
      data: machineCode,
      success: () => {
        Taro.showToast({ title: '机器码已复制！', icon: 'success' });
      }
    });
  };

  // 欢迎弹窗处理函数
  const handleCloseWelcome = () => {
    setIsWelcomeOpen(false);
    localStorage.setItem('hasSeenWelcome', 'true');
  };

  // 显示激活表单
  return (
    <View className='activation-page'>
      <View className='lock-icon'>{activated && isViewMode ? '✅' : '🔒'}</View>
      <Text className='title'>{activated && isViewMode ? '激活信息' : '软件激活'}</Text>
      <Text className='subtitle'>
        {activated && isViewMode ? '您的软件已激活，可更新激活码' : '请输入您的激活码'}
      </Text>

      <View className='form-card'>
        <View className='form-item'>
          <Text className='form-label'>机器码</Text>
          <View className='code-display'>
            <Text className='code-text'>{machineCode}</Text>
            <Button
              className='btn-copy'
              size='mini'
              onClick={copyMachineCode}
            >
              复制
            </Button>
          </View>
          <Text className='form-hint'>
            请提供此机器码以获取激活码
          </Text>
        </View>

        <View className='form-item' style={{ display: activated && isViewMode && expireDate ? 'block' : 'none' }}>
          <Text className='form-label'>到期日期</Text>
          <Text className='code-text'>{expireDate || '未激活'}</Text>
        </View>

        <View className='form-item'>
          <Text className='form-label'>激活码</Text>
          <Input
            className='input-license'
            type='text'
            placeholder='请输入激活码'
            value={licenseCode}
            maxlength={500}
            onInput={(e) => setLicenseCode(e.detail.value)}
          />
        </View>
      </View>

      <Button
        className='btn-activate'
        onClick={handleActivate}
        loading={loading}
        disabled={loading}
      >
        {activated && isViewMode ? '更新激活码' : '激活'}
      </Button>

      <View style={{ display: isViewMode ? 'block' : 'none' }}>
        <Button
          className='btn-back'
          onClick={() => Taro.navigateBack()}
        >
          返回
        </Button>
      </View>

      <View style={{ display: message ? 'block' : 'none' }}>
        <Text className='message'>{message}</Text>
      </View>

      {/* 欢迎弹窗 */}
      <WelcomeModal isOpen={isWelcomeOpen} onClose={handleCloseWelcome} />
    </View>
  );
}
