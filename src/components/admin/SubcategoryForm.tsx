import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSubcategory, updateSubcategory, type SubcategoryInsert, type Subcategory } from "@/lib/supabase/subcategories";
import { getCategories, type Category } from "@/lib/supabase/categories";

interface SubcategoryFormProps {
  subcategory?: Subcategory;
  onSuccess: () => void;
  onCancel: () => void;
}

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SubcategoryForm({ subcategory, onSuccess, onCancel }: SubcategoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!subcategory);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SubcategoryInsert>({
    defaultValues: subcategory
      ? {
          name: subcategory.name,
          slug: subcategory.slug,
          category_id: subcategory.category_id,
          icon: subcategory.icon || "",
        }
      : {
          name: "",
          slug: "",
          category_id: "",
          icon: "",
        },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
        if (subcategory) {
          setSelectedCategory(subcategory.category_id);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, [subcategory]);

  useEffect(() => {
    if (selectedCategory) {
      setValue("category_id", selectedCategory);
    }
  }, [selectedCategory, setValue]);

  const nameValue = watch("name");

  // Auto-generate slug when name changes
  useEffect(() => {
    if (autoSlug && nameValue && !subcategory) {
      const slug = generateSlug(nameValue);
      setValue("slug", slug);
    }
  }, [nameValue, autoSlug, subcategory, setValue]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setValue("name", newName);
    if (autoSlug && !subcategory) {
      setValue("slug", generateSlug(newName));
    }
  };

  const onSubmit = async (data: SubcategoryInsert) => {
    setLoading(true);
    try {
      const subcategoryData: SubcategoryInsert = {
        name: data.name,
        slug: data.slug,
        category_id: data.category_id,
        icon: data.icon || null,
      };

      if (subcategory) {
        await updateSubcategory(subcategory.id, subcategoryData);
      } else {
        await createSubcategory(subcategoryData);
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error saving subcategory:", error);
      if (error?.code === "23505") {
        alert("A subcategory with this slug already exists in this category. Please use a different slug.");
      } else {
        alert("Failed to save subcategory. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="category">Parent Category *</Label>
        <Select
          value={selectedCategory}
          onValueChange={setSelectedCategory}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.icon} {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!selectedCategory && (
          <p className="text-sm text-red-500 mt-1">Parent category is required</p>
        )}
      </div>

      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register("name", { required: "Name is required" })}
          onChange={handleNameChange}
          placeholder="Subcategory name"
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="slug">Slug *</Label>
        <div className="flex gap-2">
          <Input
            id="slug"
            {...register("slug", {
              required: "Slug is required",
              pattern: {
                value: /^[a-z0-9-]+$/,
                message: "Slug can only contain lowercase letters, numbers, and hyphens",
              },
            })}
            placeholder="subcategory-slug"
          />
          {!subcategory && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAutoSlug(!autoSlug);
                if (!autoSlug && nameValue) {
                  setValue("slug", generateSlug(nameValue));
                }
              }}
            >
              {autoSlug ? "Manual" : "Auto"}
            </Button>
          )}
        </div>
        {errors.slug && (
          <p className="text-sm text-red-500 mt-1">{errors.slug.message}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Used in URLs (e.g., /category/commercial/subcategory/business-cards)
        </p>
      </div>

      <div>
        <Label htmlFor="icon">Icon (Emoji)</Label>
        <Input
          id="icon"
          {...register("icon")}
          placeholder="🎨"
          maxLength={2}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional emoji icon for the subcategory
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : subcategory ? "Update Subcategory" : "Create Subcategory"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
