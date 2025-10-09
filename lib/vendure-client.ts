import { GraphQLClient } from 'graphql-request';

const VENDURE_SHOP_API_URL = process.env.NEXT_PUBLIC_VENDURE_API_URL || 'http://localhost:3000/shop-api';

export const vendureClient = new GraphQLClient(VENDURE_SHOP_API_URL, {
  credentials: 'include',
  mode: 'cors',
});

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vendure_auth_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('vendure_auth_token', token);
  vendureClient.setHeader('authorization', `Bearer ${token}`);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('vendure_auth_token');
  vendureClient.setHeader('authorization', '');
}

if (typeof window !== 'undefined') {
  const token = getAuthToken();
  if (token) {
    vendureClient.setHeader('authorization', `Bearer ${token}`);
  }
}
