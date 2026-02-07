import { supabase } from '../supabase';

export interface Product {
  id: string;
  title: string;
  subcategory_id: string;
  price: number;
  description: string;
  preview_image: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductInsert {
  title: string;
  subcategory_id: string;
  price: number;
  description: string;
  preview_image: string;
}

export interface ProductUpdate {
  title?: string;
  subcategory_id?: string;
  price?: number;
  description?: string;
  preview_image?: string;
}

// Fetch all products, sorted alphabetically by title
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }

  return data || [];
}

// Fetch single product by ID
export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }

  return data;
}

// Fetch products by subcategory, sorted alphabetically
export async function getProductsBySubcategory(subcategoryId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('subcategory_id', subcategoryId)
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching products by subcategory:', error);
    throw error;
  }

  return data || [];
}

// Fetch products by category (via subcategories), sorted alphabetically
export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  // First get all subcategories for this category
  const { data: subcategories, error: subError } = await supabase
    .from('subcategories')
    .select('id')
    .eq('category_id', categoryId);

  if (subError) {
    console.error('Error fetching subcategories:', subError);
    throw subError;
  }

  if (!subcategories || subcategories.length === 0) {
    return [];
  }

  const subcategoryIds = subcategories.map(s => s.id);

  // Then get all products for these subcategories
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('subcategory_id', subcategoryIds)
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching products by category:', error);
    throw error;
  }

  return data || [];
}

// Search products, sorted alphabetically
export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('title', { ascending: true });

  if (error) {
    console.error('Error searching products:', error);
    throw error;
  }

  return data || [];
}

// Get featured products (first 8), sorted alphabetically
export async function getFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('title', { ascending: true })
    .limit(8);

  if (error) {
    console.error('Error fetching featured products:', error);
    throw error;
  }

  return data || [];
}

// Create new product (admin only)
export async function createProduct(product: ProductInsert): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    throw error;
  }

  return data;
}

// Update product (admin only)
export async function updateProduct(id: string, updates: ProductUpdate): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    throw error;
  }

  return data;
}

// Delete product (admin only)
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}
