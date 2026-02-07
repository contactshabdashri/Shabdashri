import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { SubcategoryCard } from "@/components/SubcategoryCard";
import { getCategoryBySlug, getCategories } from "@/lib/supabase/categories";
import { getSubcategoriesByCategory, getSubcategoryProductCount } from "@/lib/supabase/subcategories";
import type { Category } from "@/lib/supabase/categories";
import type { Subcategory } from "@/lib/supabase/subcategories";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [cat, cats] = await Promise.all([
          getCategoryBySlug(slug || ""),
          getCategories(),
        ]);
        
        setCategory(cat || null);
        setCategories(cats);
        
        if (cat) {
          const subcats = await getSubcategoriesByCategory(cat.id);
          setSubcategories(subcats);

          // Load product counts for each subcategory
          const counts: Record<string, number> = {};
          await Promise.all(
            subcats.map(async (subcat) => {
              const count = await getSubcategoryProductCount(subcat.id);
              counts[subcat.id] = count;
            })
          );
          setProductCounts(counts);
        }
      } catch (error) {
        console.error("Error loading category data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-16 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Category not found
        </h1>
        <p className="text-muted-foreground mt-2">
          The category you're looking for doesn't exist.
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
            <span className="text-foreground font-medium">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Category Header */}
      <section className="py-8 md:py-12">
        <div className="container">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl">{category.icon}</span>
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                {category.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {subcategories.length} subcategor{subcategories.length !== 1 ? "ies" : "y"} available
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Other Categories */}
      <section className="pb-8">
        <div className="container">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className={`category-badge ${cat.id === category.id ? "bg-primary text-primary-foreground" : ""}`}
              >
                {cat.icon} {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Subcategories Grid */}
      <section className="pb-16">
        <div className="container">
          {subcategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subcategories.map((subcategory) => (
                <SubcategoryCard
                  key={subcategory.id}
                  subcategory={{
                    ...subcategory,
                    categorySlug: slug || "",
                  }}
                  productCount={productCounts[subcategory.id] ?? 0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No subcategories available in this category yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}