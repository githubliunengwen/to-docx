import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import './index.scss';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <View className="welcome-modal-overlay">
      <View className="welcome-modal">
        <View className="welcome-header">
          <Text className="welcome-title">🎉 欢迎来到AI拆书拆课神器</Text>
        </View>

        <View className="welcome-content">
          <Text className="welcome-text">
            您想不想拥有点石成金，撒豆成兵的核心超能力？这款AI拆书拆课神器：拆书成课，拆课成兵，一人可抵千军万马，AI时代打造数字员工的必备神器，从内容到变现，提供1套顶尖训练手册，零基础，搭建24小时自动赚钱的AI智能体数字员工矩阵；1个人+1门课+AI工具，开启（一次拆解，终身赚钱）的AI智能体数字员工创业路，详情请咨询推荐人
          </Text>

        </View>

        <View className="welcome-footer">
          <Button className="welcome-btn" onClick={onClose}>
            开始使用神器
          </Button>
        </View>
      </View>
    </View>
  );
};

export default WelcomeModal;
