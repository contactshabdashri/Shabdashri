import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createCategory, updateCategory, type CategoryInsert, type Category } from "@/lib/supabase/categories";

interface CategoryFormProps {
  category?: Category;
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

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!category);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CategoryInsert>({
    defaultValues: category
      ? {
          name: category.name,
          slug: category.slug,
          icon: category.icon || "",
        }
      : {
          name: "",
          slug: "",
          icon: "",
        },
  });

  const nameValue = watch("name");

  // Auto-generate slug when name changes (only if not editing existing category or auto-slug is enabled)
  useEffect(() => {
    if (autoSlug && nameValue && !category) {
      const slug = generateSlug(nameValue);
      setValue("slug", slug);
    }
  }, [nameValue, autoSlug, category, setValue]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setValue("name", newName);
    if (autoSlug && !category) {
      setValue("slug", generateSlug(newName));
    }
  };

  const onSubmit = async (data: CategoryInsert) => {
    setLoading(true);
    try {
      const categoryData: CategoryInsert = {
        name: data.name,
        slug: data.slug,
        icon: data.icon || null,
      };

      if (category) {
        await updateCategory(category.id, categoryData);
      } else {
        await createCategory(categoryData);
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error saving category:", error);
      if (error?.code === "23505") {
        alert("A category with this slug already exists. Please use a different slug.");
      } else {
        alert("Failed to save category. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register("name", { required: "Name is required" })}
          onChange={handleNameChange}
          placeholder="Category name"
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
            placeholder="category-slug"
          />
          {!category && (
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
          Used in URLs (e.g., /category/category-slug)
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
          Optional emoji icon for the category
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : category ? "Update Category" : "Create Category"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
