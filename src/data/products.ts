// Import Supabase functions
import * as productsService from "@/lib/supabase/products";
import * as categoriesService from "@/lib/supabase/categories";
import * as subcategoriesService from "@/lib/supabase/subcategories";

// Re-export types from Supabase service layer
export type { Product as ProductDB } from "@/lib/supabase/products";
export type { Category as CategoryDB } from "@/lib/supabase/categories";

// Compatibility interfaces for frontend (camelCase)
export interface Product {
  id: string;
  title: string;
  categoryId: string;
  price: number;
  description: string;
  previewImage: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

// Cache for categories and products
let categoriesCache: Category[] | null = null;
let productsCache: Product[] | null = null;

// Helper function to convert DB product to frontend format
function convertProduct(dbProduct: any): Product {
  return {
    id: dbProduct.id,
    title: dbProduct.title,
    categoryId: dbProduct.subcategory_id || "", // Use subcategory_id for compatibility
    price: Number(dbProduct.price),
    description: dbProduct.description,
    previewImage: dbProduct.preview_image,
  };
}

// Helper function to convert DB category to frontend format
function convertCategory(dbCategory: any): Category {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    slug: dbCategory.slug,
    icon: dbCategory.icon || "📦",
  };
}

// Fetch categories from Supabase
export async function getCategories(): Promise<Category[]> {
  if (categoriesCache) return categoriesCache;
  
  try {
    const dbCategories = await categoriesService.getCategories();
    categoriesCache = dbCategories.map(convertCategory);
    return categoriesCache;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

// Fetch products from Supabase, sorted alphabetically
export async function getProducts(): Promise<Product[]> {
  if (productsCache) return productsCache;
  
  try {
    const dbProducts = await productsService.getProducts();
    productsCache = dbProducts.map(convertProduct);
    return productsCache;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// Get categories (synchronous for compatibility, but will be empty initially)
export const categories: Category[] = [];

// Get products (synchronous for compatibility, but will be empty initially)
export const products: Product[] = [];

// Initialize data on module load
getCategories().then((cats) => {
  categories.length = 0;
  categories.push(...cats);
});

getProducts().then((prods) => {
  products.length = 0;
  products.push(...prods);
});

export async function getProductById(id: string): Promise<Product | undefined> {
  const prods = await getProducts();
  return prods.find(p => p.id === id);
}

// Get products by category (via subcategories)
export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  try {
    const dbProducts = await productsService.getProductsByCategory(categoryId);
    return dbProducts.map(convertProduct);
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
}

// Get products by subcategory
export async function getProductsBySubcategory(subcategoryId: string): Promise<Product[]> {
  try {
    const dbProducts = await productsService.getProductsBySubcategory(subcategoryId);
    return dbProducts.map(convertProduct);
  } catch (error) {
    console.error("Error fetching products by subcategory:", error);
    return [];
  }
}

// Get subcategories by category
export async function getSubcategoriesByCategory(categoryId: string): Promise<any[]> {
  try {
    const subcats = await subcategoriesService.getSubcategoriesByCategory(categoryId);
    return subcats.map((subcat: any) => ({
      id: subcat.id,
      name: subcat.name,
      slug: subcat.slug,
      icon: subcat.icon || "📦",
      categoryId: subcat.category_id,
    }));
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const cats = await getCategories();
  return cats.find(c => c.slug === slug);
}

export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const dbProducts = await productsService.searchProducts(query);
    return dbProducts.map(convertProduct);
  } catch (error) {
    console.error("Error searching products:", error);
    const prods = await getProducts();
    const lowerQuery = query.toLowerCase();
    return prods.filter(
      p => p.title.toLowerCase().includes(lowerQuery) ||
           p.description.toLowerCase().includes(lowerQuery)
    );
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const dbProducts = await productsService.getFeaturedProducts();
    return dbProducts.map(convertProduct);
  } catch (error) {
    console.error("Error fetching featured products:", error);
    const prods = await getProducts();
    return prods.slice(0, 8).sort((a, b) => a.title.localeCompare(b.title));
  }
}