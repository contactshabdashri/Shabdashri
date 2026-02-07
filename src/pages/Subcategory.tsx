import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { PaymentModal } from "@/components/PaymentModal";
import { getSubcategoryBySlug } from "@/lib/supabase/subcategories";
import { getCategoryById } from "@/lib/supabase/categories";
import { getProductsBySubcategory, getProductById } from "@/lib/supabase/products";
import type { Subcategory } from "@/lib/supabase/subcategories";
import type { Category } from "@/lib/supabase/categories";
import type { Product } from "@/lib/supabase/products";

// Convert DB product to frontend format
function convertProduct(dbProduct: Product): any {
  return {
    id: dbProduct.id,
    title: dbProduct.title,
    categoryId: "", // Not used in this context
    price: Number(dbProduct.price),
    description: dbProduct.description,
    previewImage: dbProduct.preview_image,
  };
}

export default function Subcategory() {
  const { categorySlug, subcategorySlug } = useParams<{ categorySlug: string; subcategorySlug: string }>();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (!categorySlug || !subcategorySlug) {
          return;
        }

        const subcat = await getSubcategoryBySlug(categorySlug, subcategorySlug);
        if (!subcat) {
          setLoading(false);
          return;
        }

        setSubcategory(subcat);

        // Get category
        const cat = await getCategoryById(subcat.category_id);
        setCategory(cat);

        // Get products
        const prods = await getProductsBySubcategory(subcat.id);
        setProducts(prods.map(convertProduct));
      } catch (error) {
        console.error("Error loading subcategory data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [categorySlug, subcategorySlug]);

  if (loading) {
    return (
      <div className="container py-16 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!subcategory || !category) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Subcategory not found
        </h1>
        <p className="text-muted-foreground mt-2">
          The subcategory you're looking for doesn't exist.
        </p>
        <Link to="/" className="text-primary hover:underline mt-4 inline-block">
          Go back to home
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-secondary/50 py-4">
        <div className="container">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link
              to={`/category/${categorySlug}`}
              className="text-muted-foreground hover:text-primary"
            >
              {category.name}
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{subcategory.name}</span>
          </nav>
        </div>
      </div>

      {/* Subcategory Header */}
      <section className="py-8 md:py-12">
        <div className="container">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl">{subcategory.icon || "📦"}</span>
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                {subcategory.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {products.length} design{products.length !== 1 ? "s" : ""} available
                {products.length > 0 && (
                  <> • Starting from ₹{Math.min(...products.map(p => p.price))}</>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="pb-16">
        <div className="container">
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onBuyClick={setSelectedProduct}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No designs available in this subcategory yet.
              </p>
            </div>
          )}
        </div>
      </section>

      <PaymentModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  );
}
