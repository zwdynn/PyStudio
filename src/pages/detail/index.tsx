import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { services } from '@/data/services';
import styles from './index.module.scss';

export default function DetailPage() {
  const [service, setService] = useState<typeof services[0] | null>(null);

  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = (currentPage as any)?.options || {};
    
    if (options.id) {
      const foundService = services.find((s) => s.id === options.id);
      if (foundService) {
        setService(foundService);
        Taro.setNavigationBarTitle({ title: foundService.title });
      }
    }
  }, []);

  const handleBuy = () => {
    Taro.showToast({ title: '购买功能开发中', icon: 'none' });
  };

  const handleContact = () => {
    Taro.showToast({ title: '客服功能开发中', icon: 'none' });
  };

  if (!service) {
    return (
      <View className={styles.page}>
        <Text>服务不存在</Text>
      </View>
    );
  }

  const discount = service.originalPrice 
    ? Math.round((1 - service.price / service.originalPrice) * 100) 
    : 0;

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.imageContainer}>
        <Image
          className={styles.serviceImage}
          src={service.image}
          mode="aspectFill"
          lazyLoad
        />
      </View>

      <View className={styles.infoSection}>
        <Text className={styles.title}>{service.title}</Text>
        <View className={styles.priceRow}>
          <Text className={styles.price}>¥{service.price}</Text>
          {service.originalPrice && (
            <Text className={styles.originalPrice}>¥{service.originalPrice}</Text>
          )}
          {discount > 0 && (
            <Text className={styles.tag}>{discount}% OFF</Text>
          )}
        </View>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statIcon}>⭐</Text>
            <Text className={styles.statText}>{service.rating}分</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statIcon}>🔥</Text>
            <Text className={styles.statText}>已售{service.sales}件</Text>
          </View>
        </View>
        <View className={styles.divider} />
        <Text className={styles.description}>{service.description}</Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>服务特色</Text>
        <View className={styles.featureList}>
          <Text className={styles.featureTag}>专业服务</Text>
          <Text className={styles.featureTag}>品质保证</Text>
          <Text className={styles.featureTag}>无忧退款</Text>
          <Text className={styles.featureTag}>随时可用</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>购买须知</Text>
        <Text className={styles.description}>
          1. 购买后请在有效期内使用<br />
          2. 使用前请提前预约<br />
          3. 不支持退换货<br />
          4. 最终解释权归商家所有
        </Text>
      </View>

      <View style={{ height: '200rpx' }} />

      <View className={styles.footer}>
        <View className={styles.contactButton} onClick={handleContact}>
          <Text className={styles.contactIcon}>💬</Text>
          <Text className={styles.contactText}>客服</Text>
        </View>
        <View className={styles.contactButton}>
          <Text className={styles.contactIcon}>❤️</Text>
          <Text className={styles.contactText}>收藏</Text>
        </View>
        <View className={styles.buyButton} onClick={handleBuy}>
          <Text className={styles.buyButtonText}>立即购买</Text>
        </View>
      </View>
    </ScrollView>
  );
}