import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, Shield, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { CategoryCard } from "@/components/CategoryCard";
import { PaymentModal } from "@/components/PaymentModal";
import { getCategories, getFeaturedProducts, getProductsByCategory } from "@/data/products";
import type { Product, Category } from "@/data/products";
import bannerImage from "@/assets/banner.png";

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, featured] = await Promise.all([
          getCategories(),
          getFeaturedProducts(),
        ]);
        setCategories(cats);
        setFeaturedProducts(featured);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <>
      {/* Banner Section */}
      <section className="pb-8 md:pb-12 w-full -mt-1">
        <div className="w-full">
          <img
            src={bannerImage}
            alt="Cultural PSDS - Premium Marathi PSD Templates for Festivals, Pandals & Events"
            className="w-full h-auto object-cover"
          />
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b border-border">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: "Instant Delivery", desc: "Get files within minutes" },
              { icon: Shield, title: "100% Safe", desc: "Secure UPI payment" },
              { icon: Sparkles, title: "Premium Quality", desc: "Professional designs" },
              { icon: MessageCircle, title: "WhatsApp Support", desc: "Quick assistance" },
            ].map((feature, i) => (
              <div key={i} className="text-center p-4">
                <feature.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-heading font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
                Browse Categories
              </h2>
              <p className="text-muted-foreground mt-1">
                Find designs by category
              </p>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  productCount={0}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 md:py-16 bg-secondary/50">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
                Featured Designs
              </h2>
              <p className="text-muted-foreground mt-1">
                Popular PSD templates at ₹50 each
              </p>
            </div>
            <Link to="/category/logo-design">
              <Button variant="outline" className="gap-2 hidden sm:flex">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onBuyClick={setSelectedProduct}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No products available yet.
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="bg-primary rounded-3xl p-8 md:p-12 text-center">
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground">
              Ready to Get Your PSD Design?
            </h2>
            <p className="text-primary-foreground/90 mt-4 max-w-xl mx-auto">
              Browse our collection, pay ₹50 via UPI, and receive your design file on WhatsApp instantly!
            </p>
            <a
              href="https://wa.me/917775025777"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-8"
            >
              <Button size="lg" variant="secondary" className="gap-2 h-12 px-8">
                <MessageCircle className="h-5 w-5" />
                Contact Us on WhatsApp
              </Button>
            </a>
          </div>
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