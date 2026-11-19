import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Order } from '@/types';
import styles from './index.module.scss';

interface OrderCardProps {
  order: Order;
}

export default function OrderCard({ order }: OrderCardProps) {
  const statusText = {
    pending: '待支付',
    paid: '待使用',
    completed: '已完成',
    cancelled: '已取消'
  };

  const statusColor = {
    pending: '#F59E0B',
    paid: '#6366F1',
    completed: '#00B42A',
    cancelled: '#86909C'
  };

  const handleClick = () => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${order.serviceId}` });
  };

  return (
    <View className={styles.card}>
      <View className={styles.header}>
        <Text className={styles.orderId}>订单号：{order.id}</Text>
        <Text className={styles.status} style={{ color: statusColor[order.status] }}>
          {statusText[order.status]}
        </Text>
      </View>
      <View className={styles.content} onClick={handleClick}>
        <Image
          className={styles.image}
          src={order.serviceImage}
          mode="aspectFill"
          lazyLoad
        />
        <View className={styles.info}>
          <Text className={styles.title}>{order.serviceTitle}</Text>
          <Text className={styles.time}>下单时间：{order.createTime}</Text>
          <View className={styles.priceRow}>
            <Text className={styles.price}>¥{order.price}</Text>
            <Text className={styles.quantity}>x{order.quantity}</Text>
          </View>
        </View>
      </View>
      <View className={styles.footer}>
        <Text className={styles.total}>共 {order.quantity} 件，合计 ¥{order.price * order.quantity}</Text>
        {order.status === 'pending' && (
          <View className={styles.button} onClick={(e) => { e.stopPropagation(); Taro.showToast({ title: '支付功能开发中', icon: 'none' }); }}>
            <Text className={styles.buttonText}>立即支付</Text>
          </View>
        )}
        {order.status === 'paid' && (
          <View className={styles.button} onClick={(e) => { e.stopPropagation(); Taro.showToast({ title: '使用功能开发中', icon: 'none' }); }}>
            <Text className={styles.buttonText}>去使用</Text>
          </View>
        )}
      </View>
    </View>
  );
}