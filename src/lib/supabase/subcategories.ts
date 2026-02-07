import { supabase } from '../supabase';

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  icon: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubcategoryInsert {
  name: string;
  slug: string;
  category_id: string;
  icon?: string | null;
}

export interface SubcategoryUpdate {
  name?: string;
  slug?: string;
  category_id?: string;
  icon?: string | null;
}

// Fetch all subcategories, sorted alphabetically by name
export async function getSubcategories(): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching subcategories:', error);
    throw error;
  }

  return data || [];
}

// Fetch subcategories by category, sorted alphabetically
export async function getSubcategoriesByCategory(categoryId: string): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching subcategories by category:', error);
    throw error;
  }

  return data || [];
}

// Fetch subcategory by slug (requires category context for uniqueness)
export async function getSubcategoryBySlug(categorySlug: string, subcategorySlug: string): Promise<Subcategory | null> {
  // First get the category
  const { data: categoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .single();

  if (!categoryData) {
    return null;
  }

  // Then get the subcategory
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .eq('category_id', categoryData.id)
    .eq('slug', subcategorySlug)
    .single();

  if (error) {
    console.error('Error fetching subcategory by slug:', error);
    return null;
  }

  return data;
}

// Fetch subcategory by ID
export async function getSubcategoryById(id: string): Promise<Subcategory | null> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching subcategory:', error);
    return null;
  }

  return data;
}

// Create new subcategory (admin only)
export async function createSubcategory(subcategory: SubcategoryInsert): Promise<Subcategory> {
  const { data, error } = await supabase
    .from('subcategories')
    .insert(subcategory)
    .select()
    .single();

  if (error) {
    console.error('Error creating subcategory:', error);
    throw error;
  }

  return data;
}

// Update subcategory (admin only)
export async function updateSubcategory(id: string, updates: SubcategoryUpdate): Promise<Subcategory> {
  const { data, error } = await supabase
    .from('subcategories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating subcategory:', error);
    throw error;
  }

  return data;
}

// Delete subcategory (admin only)
export async function deleteSubcategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('subcategories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting subcategory:', error);
    throw error;
  }
}

// Get product count for a subcategory
export async function getSubcategoryProductCount(subcategoryId: string): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('subcategory_id', subcategoryId);

  if (error) {
    console.error('Error counting products:', error);
    return 0;
  }

  return count || 0;
}
