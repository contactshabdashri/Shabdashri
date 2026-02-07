import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product, Category } from "@/data/products";
import { getCategories } from "@/data/products";

interface ProductCardProps {
  product: Product;
  onBuyClick: (product: Product) => void;
}

export function ProductCard({ product, onBuyClick }: ProductCardProps) {
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    const loadCategory = async () => {
      const categories = await getCategories();
      const cat = categories.find((c) => c.id === product.categoryId);
      setCategory(cat || null);
    };
    loadCategory();
  }, [product.categoryId]);

  return (
    <article className="product-card group">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <img
            src={product.previewImage}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute top-3 right-3">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              ₹{product.price}
            </span>
          </div>
          {category && (
            <div className="absolute top-3 left-3">
              <span className="bg-card/90 backdrop-blur-sm text-foreground px-2 py-1 rounded-md text-xs font-medium">
                {category.icon} {category.name}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-heading font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-4">
          <span className="price-tag">₹{product.price}</span>
          <Button
            size="sm"
            className="gap-2"
            onClick={(e) => {
              e.preventDefault();
              onBuyClick(product);
            }}
          >
            <ShoppingCart className="h-4 w-4" />
            Buy Now
          </Button>
        </div>
      </div>
    </article>
  );
}