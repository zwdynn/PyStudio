import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

export default function CanteenPage() {
  return (
    <View className={styles.page}>
      <View className={styles.content}>
        <Text className={styles.icon}>🍽️</Text>
        <Text className={styles.title}>食堂</Text>
        <Text className={styles.description}>美食大冒险，寻找隐藏的美味</Text>
        <View className={styles.lockBox}>
          <Text className={styles.lockIcon}>🔒</Text>
          <Text className={styles.lockText}>完成图书馆关卡后解锁</Text>
        </View>
        <View className={styles.backButton} onClick={() => Taro.navigateBack()}>
          <Text className={styles.backText}>返回地图</Text>
        </View>
      </View>
    </View>
  );
}