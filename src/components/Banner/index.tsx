import React from 'react';
import { Swiper, SwiperItem, Image, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Banner } from '@/types';
import styles from './index.module.scss';

interface BannerProps {
  banners: Banner[];
}

export default function BannerComponent({ banners }: BannerProps) {
  const handleClick = (banner: Banner) => {
    if (banner.link) {
      Taro.navigateTo({ url: banner.link });
    }
  };

  return (
    <View className={styles.bannerContainer}>
      <Swiper
        className={styles.swiper}
        indicatorDots
        autoplay
        circular
        interval={3000}
        duration={500}
        indicatorColor="rgba(255,255,255,0.5)"
        indicatorActiveColor="#ffffff"
      >
        {banners.map((banner) => (
          <SwiperItem key={banner.id} onClick={() => handleClick(banner)}>
            <Image
              className={styles.bannerImage}
              src={banner.image}
              mode="aspectFill"
              lazyLoad
            />
            <View className={styles.bannerOverlay}>
              <View className={styles.bannerTitle}>{banner.title}</View>
            </View>
          </SwiperItem>
        ))}
      </Swiper>
    </View>
  );
}