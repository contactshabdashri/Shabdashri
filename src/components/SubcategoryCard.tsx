import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

interface SubcategoryCardProps {
  subcategory: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    categorySlug: string;
  };
  productCount: number;
}

export function SubcategoryCard({ subcategory, productCount }: SubcategoryCardProps) {
  return (
    <Link
      to={`/category/${subcategory.categorySlug}/subcategory/${subcategory.slug}`}
      className="block"
    >
      <Card className="hover:shadow-lg transition-shadow h-full">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <span className="text-4xl mb-3">{subcategory.icon || "📦"}</span>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
              {subcategory.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {productCount} design{productCount !== 1 ? "s" : ""}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
