import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import OrderCard from '@/components/OrderCard';
import { orders } from '@/data/orders';
import styles from './index.module.scss';

export default function OrderPage() {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待支付' },
    { key: 'paid', label: '待使用' },
    { key: 'completed', label: '已完成' }
  ];

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter((order) => order.status === activeTab);

  const handleTabClick = (key: string) => {
    setActiveTab(key);
  };

  const handleGoHome = () => {
    Taro.switchTab({ url: '/pages/home/index' });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.tabs}>
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className={`${styles.tabItem} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => handleTabClick(tab.key)}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
          </View>
        ))}
      </View>

      {filteredOrders.length > 0 ? (
        <View className={styles.orderList}>
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </View>
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📦</Text>
          <Text className={styles.emptyText}>暂无相关订单</Text>
          <View className={styles.emptyButton} onClick={handleGoHome}>
            <Text className={styles.emptyButtonText}>去逛逛</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}