import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Category } from '@/types';
import styles from './index.module.scss';

interface CategoryItemProps {
  category: Category;
  isActive?: boolean;
  onClick?: () => void;
}

export default function CategoryItem({ category, isActive, onClick }: CategoryItemProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({ url: `/pages/category/index?id=${category.id}` });
    }
  };

  return (
    <View
      className={styles.item}
      onClick={handleClick}
    >
      <View className={styles.icon}>
        <Text className={styles.iconText}>{category.icon}</Text>
      </View>
      <Text className={styles.name}>{category.name}</Text>
      <Text className={styles.count}>{category.count}</Text>
    </View>
  );
}