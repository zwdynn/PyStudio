import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Service } from '@/types';
import styles from './index.module.scss';

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const handleClick = () => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${service.id}` });
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.imageContainer}>
        <Image
          className={styles.image}
          src={service.image}
          mode="aspectFill"
          lazyLoad
        />
        {service.originalPrice && (
          <View className={styles.tag}>
            <Text className={styles.tagText}>
              {Math.round((1 - service.price / service.originalPrice) * 100)}% OFF
            </Text>
          </View>
        )}
      </View>
      <View className={styles.content}>
        <Text className={styles.title}>{service.title}</Text>
        <Text className={styles.description}>{service.description}</Text>
        <View className={styles.footer}>
          <View className={styles.priceInfo}>
            <Text className={styles.price}>¥{service.price}</Text>
            {service.originalPrice && (
              <Text className={styles.originalPrice}>¥{service.originalPrice}</Text>
            )}
          </View>
          <View className={styles.salesInfo}>
            <Text className={styles.sales}>已售 {service.sales}</Text>
            <Text className={styles.rating}>★{service.rating}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}