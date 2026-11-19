import React, { useState, useEffect } from 'react';
import { View, Text, Button, Image, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGameStore } from '../../stores/gameStore';
import { getLastCloudError } from '../../services/cloud';
import styles from './index.module.scss';

const STORAGE_KEY = 'campus-explorer-game';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nickName, setNickName] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = Taro.getStorageSync(STORAGE_KEY);
    let loggedIn = false;
    if (stored) {
      try {
        const data = typeof stored === 'string' ? JSON.parse(stored) : stored;
        if (data.openid) {
          loggedIn = true;
          Taro.redirectTo({ url: '/pages/home/index' });
        }
      } catch (e) {
        // ignore parse error
      }
    }
    if (!loggedIn) {
      setChecking(false);
    }
  }, []);

  const handleEnter = () => {
    setShowLogin(true);
  };

  // 微信 getUserProfile 已废弃，直接进入头像+昵称填写流程
  const handleWxLogin = () => {
    setShowProfile(true);
  };

  const handleChooseAvatar = (e: any) => {
    setAvatarUrl(e.detail.avatarUrl);
  };

  const handleNicknameInput = (e: any) => {
    setNickName(e.detail.value);
  };

  const handleConfirmLogin = async () => {
    if (!avatarUrl) {
      Taro.showToast({ title: '请先选择头像', icon: 'none' });
      return;
    }
    if (!nickName.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      const { loginFromServer } = useGameStore.getState();
      // 头像与昵称一起写入 users 集合，云函数内用 OPENID 定位用户
      const success = await loginFromServer(nickName.trim(), avatarUrl);

      if (success) {
        Taro.showToast({ title: '登录成功！', icon: 'success' });
      } else {
        // 云登录失败时把真实原因摊出来，否则手机端只能看到「离线模式」，无从排查
        const detail = getLastCloudError() || '云函数无响应';
        Taro.showModal({
          title: '云端连接失败',
          content: `已进入本地模式，成绩不会上传。\n\n原因：${detail}\n\n可在「我的 → 云连接自检」查看完整链路。`,
          showCancel: false,
          confirmText: '知道了'
        });
      }
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/home/index' });
      }, success ? 800 : 1600);
    } catch (err) {
      Taro.showToast({ title: '登录失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Taro.redirectTo({ url: '/pages/home/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.bgImg} />

      {checking ? null : (
      <>
      <View className={styles.topOverlay}>
        <Text className={styles.schoolName}>天津科技大学</Text>
        <Text className={styles.appSubtitle}>校园探索之旅</Text>
      </View>

      {!showLogin ? (
        <View className={styles.bottomArea}>
          <View className={styles.btnRow}>
            <View className={`${styles.actionBtn} ${styles.btnGreen}`} onClick={handleEnter}>
              <Text className={styles.actionBtnIcon}>🚪</Text>
              <Text className={styles.actionBtnText}>校园穿梭</Text>
            </View>
            <View className={`${styles.actionBtn} ${styles.btnOrange}`} onClick={handleEnter}>
              <Text className={styles.actionBtnIcon}>📍</Text>
              <Text className={styles.actionBtnText}>一键打卡</Text>
            </View>
          </View>
          <View className={styles.homeIndicator} />
        </View>
      ) : (
        <View className={styles.loginOverlay}>
          <View className={styles.loginSheet}>
            {!showProfile ? (
              <>
                <Text className={styles.sheetTitle}>开启校园冒险</Text>
                <Text className={styles.sheetSubtitle}>登录后同步你的探索进度</Text>

                <View className={styles.featureRow}>
                  <View className={styles.featureChip}>
                    <Text className={styles.featureEmoji}>🗺️</Text>
                    <Text className={styles.featureLabel}>地图探索</Text>
                  </View>
                  <View className={styles.featureChip}>
                    <Text className={styles.featureEmoji}>🎮</Text>
                    <Text className={styles.featureLabel}>趣味闯关</Text>
                  </View>
                  <View className={styles.featureChip}>
                    <Text className={styles.featureEmoji}>🏆</Text>
                    <Text className={styles.featureLabel}>成长记录</Text>
                  </View>
                </View>

                <Button
                  className={styles.primaryBtn}
                  onClick={handleWxLogin}
                  loading={loading}
                  disabled={loading}
                >
                  <Text className={styles.primaryBtnIcon}>💚</Text>
                  <Text className={styles.primaryBtnText}>微信一键登录</Text>
                </Button>

                <View className={styles.sheetSkip} onClick={handleSkip}>
                  <Text className={styles.sheetSkipText}>暂不登录，先看看</Text>
                </View>

                <Text className={styles.agreement}>
                  登录即表示同意用户协议和隐私政策
                </Text>
              </>
            ) : (
              <>
                <Text className={styles.sheetTitle}>完善个人信息</Text>
                <Text className={styles.sheetSubtitle}>设置你的头像和昵称</Text>

                <View className={styles.avatarWrap}>
                  <Button
                    className={styles.avatarBtn}
                    openType='chooseAvatar'
                    onChooseAvatar={handleChooseAvatar}
                  >
                    {avatarUrl ? (
                      <Image className={styles.avatarImg} src={avatarUrl} mode='aspectFill' />
                    ) : (
                      <View className={styles.avatarPh}>
                        <Text className={styles.avatarPhIcon}>📷</Text>
                        <Text className={styles.avatarPhText}>选择头像</Text>
                      </View>
                    )}
                  </Button>
                </View>

                <Input
                  className={styles.nickInput}
                  type='nickname'
                  placeholder='请输入昵称'
                  value={nickName}
                  onInput={handleNicknameInput}
                  maxlength={20}
                />

                <Button
                  className={styles.primaryBtn}
                  onClick={handleConfirmLogin}
                  loading={loading}
                  disabled={loading || !avatarUrl}
                >
                  <Text className={styles.primaryBtnText}>
                    {loading ? '登录中...' : '确认登录'}
                  </Text>
                </Button>

                <View className={styles.sheetSkip} onClick={handleSkip}>
                  <Text className={styles.sheetSkipText}>跳过</Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}
      </>
      )}
    </View>
  );
}
