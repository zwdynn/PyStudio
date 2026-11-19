export interface Banner {
  id: string;
  image: string;
  title: string;
  link?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface Service {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice?: number;
  sales: number;
  rating: number;
  categoryId: string;
  description: string;
}

export interface Order {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceImage: string;
  price: number;
  quantity: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  createTime: string;
  payTime?: string;
}

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  phone?: string;
  balance?: number;
}