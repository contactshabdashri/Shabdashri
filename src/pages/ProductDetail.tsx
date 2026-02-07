import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, ShoppingCart, Share2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentModal } from "@/components/PaymentModal";
import { ProductCard } from "@/components/ProductCard";
import { getProductById, getProductsBySubcategory } from "@/lib/supabase/products";
import { getCategoryById } from "@/lib/supabase/categories";
import { getSubcategoryById } from "@/lib/supabase/subcategories";
import type { Product } from "@/lib/supabase/products";
import type { Category } from "@/lib/supabase/categories";
import type { Subcategory } from "@/lib/supabase/subcategories";

// Convert DB product to frontend format
function convertProduct(dbProduct: Product): any {
  return {
    id: dbProduct.id,
    title: dbProduct.title,
    categoryId: "", // Not used
    price: Number(dbProduct.price),
    description: dbProduct.description,
    previewImage: dbProduct.preview_image,
  };
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const prod = await getProductById(id || "");
        if (prod) {
          setProduct(prod);
          
          // Get subcategory and category
          const subcat = await getSubcategoryById(prod.subcategory_id);
          if (subcat) {
            setSubcategory(subcat);
            const cat = await getCategoryById(subcat.category_id);
            setCategory(cat);
            
            // Get related products from same subcategory
            const related = await getProductsBySubcategory(prod.subcategory_id);
            setRelatedProducts(
              related
                .filter((p) => p.id !== prod.id)
                .slice(0, 4)
                .map(convertProduct)
            );
          }
        }
      } catch (error) {
        console.error("Error loading product:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-16 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  const convertedProduct = product ? convertProduct(product) : null;

  if (!product || !convertedProduct) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Product not found
        </h1>
        <p className="text-muted-foreground mt-2">
          The design you're looking for doesn't exist.
        </p>
        <Link to="/" className="text-primary hover:underline mt-4 inline-block">
          Go back to home
        </Link>
      </div>
    );
  }

  const handleShare = async () => {
    if (navigator.share && convertedProduct) {
      await navigator.share({
        title: convertedProduct.title,
        text: `Check out this PSD design for just ₹${convertedProduct.price}: ${convertedProduct.title}`,
        url: window.location.href,
      });
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-secondary/50 py-4">
        <div className="container">
          <nav className="flex items-center gap-2 text-sm flex-wrap">
            <Link to="/" className="text-muted-foreground hover:text-primary">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {category && (
              <>
                <Link
                  to={`/category/${category.slug}`}
                  className="text-muted-foreground hover:text-primary"
                >
                  {category.name}
                </Link>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </>
            )}
            {subcategory && category && (
              <>
                <Link
                  to={`/category/${category.slug}/subcategory/${subcategory.slug}`}
                  className="text-muted-foreground hover:text-primary"
                >
                  {subcategory.name}
                </Link>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </>
            )}
            <span className="text-foreground font-medium line-clamp-1">
              {convertedProduct.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Product Detail */}
      <section className="py-8 md:py-12">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-card">
              <img
                src={convertedProduct.previewImage}
                alt={convertedProduct.title}
                className="w-full aspect-square object-cover"
              />
            </div>

            {/* Details */}
            <div className="space-y-6">
              {category && (
                <Link
                  to={`/category/${category.slug}`}
                  className="category-badge"
                >
                  {category.icon} {category.name}
                </Link>
              )}

              <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                {convertedProduct.title}
              </h1>

              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-primary">
                  ₹{convertedProduct.price}
                </span>
                <span className="text-muted-foreground line-through">₹199</span>
                <span className="bg-success/10 text-success px-2 py-1 rounded-md text-sm font-medium">
                  75% OFF
                </span>
              </div>

              <p className="text-muted-foreground text-lg leading-relaxed">
                {convertedProduct.description}
              </p>

              <ul className="space-y-3">
                {[
                  "Fully editable PSD file",
                  "Organized layers",
                  "High resolution",
                  "Commercial use allowed",
                  "Instant delivery via WhatsApp",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  size="lg"
                  className="flex-1 sm:flex-none gap-2 h-12 px-8"
                  onClick={() => setSelectedProduct(convertedProduct)}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Buy Now - ₹{convertedProduct.price}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 h-12"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                  Share
                </Button>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                <p className="text-sm text-foreground">
                  <strong>How to buy:</strong> Click "Buy Now", pay ₹{convertedProduct.price} via UPI QR code, 
                  confirm payment on WhatsApp, and receive your PSD file instantly!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-12 md:py-16 bg-secondary/50">
          <div className="container">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-8">
              Related Designs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onBuyClick={setSelectedProduct}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <PaymentModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  );
}