import { Order } from '@/types';

export const orders: Order[] = [
  {
    id: 'ORD001',
    serviceId: '1',
    serviceTitle: '精致下午茶套餐',
    serviceImage: 'https://picsum.photos/id/292/300/300',
    price: 68,
    quantity: 2,
    status: 'completed',
    createTime: '2026-07-20 14:30',
    payTime: '2026-07-20 14:35'
  },
  {
    id: 'ORD002',
    serviceId: '5',
    serviceTitle: '全屋深度保洁',
    serviceImage: 'https://picsum.photos/id/598/300/300',
    price: 268,
    quantity: 1,
    status: 'paid',
    createTime: '2026-07-21 09:15',
    payTime: '2026-07-21 09:20'
  },
  {
    id: 'ORD003',
    serviceId: '3',
    serviceTitle: '瑜伽体验课',
    serviceImage: 'https://picsum.photos/id/103/300/300',
    price: 29,
    quantity: 1,
    status: 'pending',
    createTime: '2026-07-22 18:00'
  },
  {
    id: 'ORD004',
    serviceId: '6',
    serviceTitle: '卡丁车体验',
    serviceImage: 'https://picsum.photos/id/160/300/300',
    price: 88,
    quantity: 3,
    status: 'cancelled',
    createTime: '2026-07-19 10:00'
  }
];