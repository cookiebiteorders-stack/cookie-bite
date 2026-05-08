export interface CartItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  size?: string;
  color?: string;
  image: string;
  maxStock: number;
}

