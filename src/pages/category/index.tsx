import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { categories } from '@/data/categories';
import { services } from '@/data/services';
import styles from './index.module.scss';

export default function CategoryPage() {
  const [activeCategoryId, setActiveCategoryId] = useState('1');
  const [categoryServices, setCategoryServices] = useState(services.filter((s) => s.categoryId === '1'));

  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = (currentPage as any)?.options || {};
    if (options.id) {
      setActiveCategoryId(options.id);
    }
  }, []);

  useEffect(() => {
    const filtered = services.filter((service) => service.categoryId === activeCategoryId);
    setCategoryServices(filtered);
  }, [activeCategoryId]);

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategoryId(categoryId);
  };

  const handleServiceClick = (serviceId: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${serviceId}` });
  };

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  return (
    <View className={styles.page}>
      <ScrollView className={styles.container} scrollY>
        <ScrollView className={styles.leftSidebar} scrollY>
          {categories.map((category) => (
            <View
              key={category.id}
              className={`${styles.sidebarItem} ${activeCategoryId === category.id ? styles.active : ''}`}
              onClick={() => handleCategoryClick(category.id)}
            >
              <Text className={styles.sidebarText}>{category.name}</Text>
            </View>
          ))}
        </ScrollView>

        <ScrollView className={styles.rightContent} scrollY>
          <View className={styles.contentHeader}>
            <Text className={styles.contentTitle}>{activeCategory?.name || '全部'}</Text>
            <Text className={styles.contentCount}>共 {categoryServices.length} 项服务</Text>
          </View>

          {categoryServices.length > 0 ? (
            <View className={styles.servicesGrid}>
              {categoryServices.map((service) => (
                <View
                  key={service.id}
                  className={styles.serviceItem}
                  onClick={() => handleServiceClick(service.id)}
                >
                  <Image
                    className={styles.serviceImage}
                    src={service.image}
                    mode="aspectFill"
                    lazyLoad
                  />
                  <View className={styles.serviceInfo}>
                    <Text className={styles.serviceTitle}>{service.title}</Text>
                    <Text className={styles.servicePrice}>¥{service.price}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📭</Text>
              <Text className={styles.emptyText}>暂无相关服务</Text>
            </View>
          )}
        </ScrollView>
      </ScrollView>
    </View>
  );
}