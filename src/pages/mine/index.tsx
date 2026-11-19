import React from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGameStore } from '@/stores/gameStore';
import { diagnoseCloud } from '@/services/cloud';
import styles from './index.module.scss';

export default function MinePage() {
  const { levels, nickname, avatar, syncEnabled, syncing, resetProgress, syncToServer, submitFeedback } =
    useGameStore();

  const completedCount = levels.filter(l => l.completed).length;
  const totalCount = levels.length;
  const progressPercent = (completedCount / totalCount) * 100;

  const menuItems = [
    { icon: '🏆', text: '成就', value: `${completedCount}/${totalCount}`, action: 'catalog' },
    { icon: '☁️', text: '同步进度', value: syncEnabled ? (syncing ? '同步中...' : '已连接云端') : '离线模式', action: 'sync' },
    { icon: '📝', text: '意见反馈', value: '', action: 'feedback' },
    { icon: '🩺', text: '云连接自检', value: syncEnabled ? '云端正常' : '未连接', action: 'diagnose' },
    { icon: 'ℹ️', text: '关于我们', value: '', action: 'about' }
  ];

  const handleDiagnose = async () => {
    Taro.showLoading({ title: '自检中...', mask: true });
    let text = '';
    try {
      const report = await diagnoseCloud();
      const lines = report.items.map(
        (i) => `${i.ok ? '✅' : '❌'} ${i.name}\n    ${i.detail}`
      );
      text = [`环境ID：${report.envId}`, '', ...lines].join('\n');
    } catch (e: any) {
      text = `自检异常：${e && e.message ? e.message : e}`;
    }
    Taro.hideLoading();
    console.log('[自检]', text);
    Taro.showModal({
      title: '云连接自检',
      content: text,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          Taro.setClipboardData({ data: text });
        }
      }
    });
  };

  const handleSync = async () => {
    if (!syncEnabled) {
      Taro.showToast({ title: '当前离线模式，请先登录', icon: 'none' });
      return;
    }
    Taro.showLoading({ title: '同步中...' });
    await syncToServer();
    Taro.hideLoading();
    Taro.showToast({ title: '同步完成', icon: 'success' });
  };

  const handleFeedback = () => {
    if (!syncEnabled) {
      Taro.showToast({ title: '请先登录后再反馈', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '意见反馈',
      editable: true,
      placeholderText: '请描述你遇到的问题或建议（500 字内）',
      success: async (res) => {
        if (!res.confirm) return;
        const content = String((res as any).content || '').trim();
        if (!content) {
          Taro.showToast({ title: '反馈内容不能为空', icon: 'none' });
          return;
        }
        const success = await submitFeedback(content);
        Taro.showToast({
          title: success ? '已提交，感谢反馈' : '提交失败，请稍后再试',
          icon: 'none'
        });
      }
    } as any);
  };

  const handleMenuClick = (action: string) => {
    switch (action) {
      case 'catalog':
        Taro.navigateTo({ url: '/pages/catalog/index' });
        break;
      case 'sync':
        void handleSync();
        break;
      case 'feedback':
        handleFeedback();
        break;
      case 'diagnose':
        void handleDiagnose();
        break;
      case 'about':
        Taro.showModal({
          title: '关于我们',
          content: '校园探索之旅 · 天津科技大学\n基于微信云开发构建，数据云端同步。',
          showCancel: false
        });
        break;
      default:
        break;
    }
  };

  const handleReset = () => {
    Taro.showModal({
      title: '确认重置',
      content: '确定要重置所有游戏进度吗？',
      success: (res) => {
        if (res.confirm) {
          resetProgress();
          Taro.showToast({ title: '进度已重置', icon: 'success' });
        }
      }
    });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <View className={styles.avatar}>
          {avatar ? (
            <Image className={styles.avatarImg} src={avatar} mode='aspectFill' />
          ) : (
            <Text className={styles.avatarIcon}>🎓</Text>
          )}
        </View>
        <View className={styles.userInfo}>
          <Text className={styles.nickname}>{nickname || '校园探险家'}</Text>
          <Text className={styles.level}>Lv.{completedCount + 1} 新生{syncEnabled ? '' : ' · 离线模式'}</Text>
        </View>
      </View>

      <View className={styles.progressCard}>
        <View className={styles.progressHeader}>
          <Text className={styles.progressTitle}>🏛️ 探索进度</Text>
          <Text className={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
        </View>
        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${progressPercent}%` }}></View>
        </View>
        <View className={styles.progressInfo}>
          <Text className={styles.progressText}>已完成 {completedCount} / {totalCount} 个地点</Text>
        </View>
      </View>

      <View className={styles.levelList}>
        <Text className={styles.sectionTitle}>📍 已解锁地点</Text>
        <View className={styles.levelGrid}>
          {levels.map((level) => (
            <View key={level.id} className={`${styles.levelItem} ${level.unlocked ? '' : styles.locked}`}>
              <Text className={styles.levelIcon}>{level.icon}</Text>
              <Text className={styles.levelName}>{level.name}</Text>
              {level.completed && <Text className={styles.completedBadge}>✓</Text>}
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.menuList}>
          {menuItems.map((item) => (
            <View key={item.text} className={styles.menuItem} onClick={() => handleMenuClick(item.action)}>
              <View className={styles.menuLeft}>
                <Text className={styles.menuIcon}>{item.icon}</Text>
                <Text className={styles.menuText}>{item.text}</Text>
              </View>
              <View className={styles.menuRight}>
                {item.value && <Text className={styles.menuValue}>{item.value}</Text>}
                <Text className={styles.menuArrow}>›</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.resetButton} onClick={handleReset}>
        <Text className={styles.resetText}>重置游戏进度</Text>
      </View>
    </ScrollView>
  );
}