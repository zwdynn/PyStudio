import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGameStore } from '@/stores/gameStore';
import styles from './index.module.scss';

interface LevelCardProps {
  level: {
    id: string;
    name: string;
    location: string;
    description: string;
    unlocked: boolean;
    completed: boolean;
    currentAct: number;
    totalActs: number;
    icon: string;
    color: string;
  };
}

function LevelCard({ level }: LevelCardProps) {
  const { setCurrentLevel } = useGameStore();

  const handleClick = () => {
    if (!level.unlocked) {
      Taro.showToast({ title: '完成前一关解锁', icon: 'none' });
      return;
    }
    setCurrentLevel(level.id);
    Taro.navigateTo({ url: `/pages/${level.id}/index` });
  };

  return (
    <View 
      className={`${styles.levelCard} ${!level.unlocked ? styles.locked : ''}`}
      onClick={handleClick}
    >
      <View className={styles.cardLeft}>
        <View className={styles.iconBg} style={{ backgroundColor: level.unlocked ? level.color : '#E5E7EB' }}>
          {level.completed ? (
            <Text className={styles.completedIcon}>✓</Text>
          ) : (
            <Text className={styles.icon}>{level.icon}</Text>
          )}
        </View>
      </View>
      
      <View className={styles.cardRight}>
        <View className={styles.cardHeader}>
          <Text className={styles.levelName}>{level.name}</Text>
          <Text className={styles.location}>{level.location}</Text>
        </View>
        <Text className={styles.description}>{level.description}</Text>
        
        <View className={styles.progressInfo}>
          <View className={styles.progressBar}>
            <View 
              className={styles.progressFill} 
              style={{ 
                width: `${(level.completed ? level.totalActs : level.currentAct - 1) / level.totalActs * 100}%`,
                backgroundColor: level.unlocked ? level.color : '#ccc'
              }}
            ></View>
          </View>
          <Text className={styles.progressText}>
            {level.completed ? '已完成' : `${level.currentAct - 1}/${level.totalActs} 幕`}
          </Text>
        </View>
      </View>

      {!level.unlocked && (
        <View className={styles.lockOverlay}>
          <Text className={styles.lockText}>🔒 未解锁</Text>
        </View>
      )}

      {level.unlocked && !level.completed && (
        <View className={styles.playButton} style={{ backgroundColor: level.color }}>
          <Text className={styles.playText}>继续</Text>
        </View>
      )}

      {level.completed && (
        <View className={styles.replayButton}>
          <Text className={styles.replayText}>重玩</Text>
        </View>
      )}
    </View>
  );
}

export default function CatalogPage() {
  const { levels } = useGameStore();

  const completedCount = levels.filter(l => l.completed).length;
  const totalCount = levels.length;

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <Text className={styles.title}>📋 关卡目录</Text>
        <Text className={styles.count}>已解锁 {completedCount + 1} / {totalCount} 个关卡</Text>
      </View>

      <View className={styles.levelList}>
        {levels.map((level, index) => (
          <View key={level.id} className={styles.levelItem}>
            {index > 0 && levels[index - 1] && (
              <View className={styles.connectLine}>
                <View className={`${styles.line} ${levels[index - 1].completed ? styles.completed : ''}`}></View>
              </View>
            )}
            <LevelCard level={level} />
          </View>
        ))}
      </View>

      <View className={styles.tipSection}>
        <Text className={styles.tipIcon}>💡</Text>
        <Text className={styles.tipText}>完成当前关卡后，下一关将自动解锁</Text>
      </View>
    </ScrollView>
  );
}