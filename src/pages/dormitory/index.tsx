import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

export default function DormitoryPage() {
  return (
    <View className={styles.page}>
      <View className={styles.content}>
        <Text className={styles.icon}>🏠</Text>
        <Text className={styles.title}>宿舍区</Text>
        <Text className={styles.description}>温馨的家园，结交新朋友</Text>
        <View className={styles.lockBox}>
          <Text className={styles.lockIcon}>🔒</Text>
          <Text className={styles.lockText}>完成教学楼关卡后解锁</Text>
        </View>
        <View className={styles.backButton} onClick={() => Taro.navigateBack()}>
          <Text className={styles.backText}>返回地图</Text>
        </View>
      </View>
    </View>
  );
}