import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { PaymentModal } from "@/components/PaymentModal";
import { searchProducts } from "@/data/products";
import type { Product } from "@/data/products";

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (query) {
        setLoading(true);
        try {
          const searchResults = await searchProducts(query);
          setResults(searchResults);
        } catch (error) {
          console.error("Error searching products:", error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    };
    performSearch();
  }, [query]);

  return (
    <>
      {/* Search Header */}
      <section className="bg-secondary/50 py-8 md:py-12">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground text-center mb-6">
              Search Results
            </h1>
            <form className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                defaultValue={query}
                placeholder="Search PSD designs..."
                className="pl-12 h-12 text-lg bg-card"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const value = (e.target as HTMLInputElement).value;
                    window.location.href = `/search?q=${encodeURIComponent(value)}`;
                  }
                }}
              />
            </form>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-8 md:py-12">
        <div className="container">
          {query ? (
            <>
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Searching...</p>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground mb-8">
                    {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
                  </p>
                  {results.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {results.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onBuyClick={setSelectedProduct}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No designs found matching your search.
                  </p>
                  <Link to="/" className="text-primary hover:underline">
                    Browse all designs
                  </Link>
                </div>
              )}
                </>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Enter a search term to find designs.
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