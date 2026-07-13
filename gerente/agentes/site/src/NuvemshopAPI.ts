import 'dotenv/config';

const STORE_ID = process.env.NUVEMSHOP_STORE_ID;
const TOKEN = process.env.NUVEMSHOP_ACCESS_TOKEN;
const BASE_URL = `https://api.nuvemshop.com.br/v1/${STORE_ID}`;

function headers() {
  if (!STORE_ID || !TOKEN) {
    throw new Error('Configure NUVEMSHOP_STORE_ID e NUVEMSHOP_ACCESS_TOKEN no .env');
  }
  return {
    Authorization: `bearer ${TOKEN}`,
    'User-Agent': 'ecommerce-gerente (viniteixeira085@gmail.com)',
    'Content-Type': 'application/json',
  };
}

async function request<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const resp = await fetch(url.toString(), { headers: headers() });
  if (!resp.ok) {
    throw new Error(`Nuvemshop API erro ${resp.status} em ${path}: ${await resp.text()}`);
  }
  return resp.json() as Promise<T>;
}

async function getAllPages<T>(path: string, extra?: Record<string, string>): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const batch = await request<T[]>(path, { page: String(page), per_page: '200', ...extra });
    all.push(...batch);
    if (batch.length < 200) break;
    page++;
  }
  return all;
}

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface NSProduct {
  id: number;
  name: { pt: string };
  description: { pt: string } | null;
  handle: { pt: string };
  seo_title: { pt: string | null } | null;
  seo_description: { pt: string | null } | null;
  images: Array<{ src: string; alt: { pt: string | null } | null }>;
  categories: Array<{ id: number; name: { pt: string } }>;
  variants: Array<{
    id: number;
    price: string;
    stock: number | null;
    stock_management: boolean;
  }>;
  published: boolean;
  canonical_url: string;
}

export interface NSOrder {
  id: number;
  number: number;
  status: string;
  payment_status: string;
  shipping_status: string;
  created_at: string;
  total: string;
  subtotal: string;
  discount: string;
  customer: { name: string } | null;
  products: Array<{
    product_id: number;
    name: string;
    quantity: number;
    price: string;
  }>;
}

export interface NSStore {
  name: string;
  url: string;
  email: string;
  country: string;
  currency: string;
}

export interface NSTheme {
  id: number;
  name: string;
  code: string;
  role: 'main' | 'unpublished' | 'demo';
  created_at: string;
  updated_at: string;
}

// ── Funções públicas ──────────────────────────────────────────────────────────

export async function getThemes(): Promise<NSTheme[]> {
  return request<NSTheme[]>('/themes');
}

export async function getActiveTheme(): Promise<NSTheme | null> {
  const themes = await getThemes();
  return themes.find(t => t.role === 'main') ?? null;
}

export async function getProducts(): Promise<NSProduct[]> {
  return getAllPages<NSProduct>('/products');
}

export async function getOrders(params?: Record<string, string>): Promise<NSOrder[]> {
  return getAllPages<NSOrder>('/orders', params);
}

export async function getStore(): Promise<NSStore> {
  return request<NSStore>('/store');
}

export function ptField(field: { pt: string | null } | null | undefined): string {
  return field?.pt ?? '';
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
