import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct, updateProduct, type ProductInsert, type Product } from "@/lib/supabase/products";
import { getCategories, type Category } from "@/lib/supabase/categories";
import { getSubcategories, type Subcategory } from "@/lib/supabase/subcategories";
import { uploadProductImage } from "@/lib/supabase/storage";

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [imageMethod, setImageMethod] = useState<"url" | "upload">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductInsert>({
    mode: "onChange",
    defaultValues: product
      ? {
          title: product.title,
          subcategory_id: product.subcategory_id,
          price: product.price,
          description: product.description,
          preview_image: product.preview_image,
        }
      : {
          title: "",
          subcategory_id: "",
          price: 50,
          description: "",
          preview_image: "",
        },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, subcats] = await Promise.all([
          getCategories(),
          getSubcategories(),
        ]);
        setCategories(cats);
        setSubcategories(subcats);
        
        if (product) {
          // Find the subcategory to get its category
          const subcat = subcats.find(s => s.id === product.subcategory_id);
          if (subcat) {
            setSelectedCategory(subcat.category_id);
            setSelectedSubcategory(product.subcategory_id);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [product]);

  useEffect(() => {
    if (selectedSubcategory) {
      setValue("subcategory_id", selectedSubcategory, { shouldValidate: true });
    }
  }, [selectedSubcategory, setValue]);

  // Filter subcategories based on selected category
  const filteredSubcategories = selectedCategory
    ? subcategories.filter(s => s.category_id === selectedCategory)
    : subcategories;

  const getSubcategoryDisplayName = (subcat: Subcategory): string => {
    const category = categories.find(c => c.id === subcat.category_id);
    return category ? `${category.name} > ${subcat.name}` : subcat.name;
  };

  useEffect(() => {
    // Set preview URL from product or form value
    const imageUrl = watch("preview_image");
    if (imageUrl && imageMethod === "url") {
      setPreviewUrl(imageUrl);
    } else if (selectedFile && imageMethod === "upload") {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl("");
    }
  }, [watch("preview_image"), selectedFile, imageMethod]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setValue("preview_image", ""); // Clear URL when file is selected
    }
  };

  const handleImageMethodChange = (method: "url" | "upload") => {
    setImageMethod(method);
    if (method === "url") {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      setValue("preview_image", "");
    }
  };

  const onSubmit = async (data: ProductInsert) => {
    setLoading(true);
    setUploading(false);
    
    // Validate subcategory is selected
    if (!selectedSubcategory) {
      alert("Please select a subcategory before saving the product.");
      setLoading(false);
      return;
    }

    // Ensure subcategory_id is set
    if (!data.subcategory_id) {
      setValue("subcategory_id", selectedSubcategory);
      data.subcategory_id = selectedSubcategory;
    }
    
    try {
      let imageUrl = data.preview_image;

      // If file is selected, upload it first
      if (imageMethod === "upload" && selectedFile) {
        setUploading(true);
        try {
          imageUrl = await uploadProductImage(selectedFile, product?.id);
          setValue("preview_image", imageUrl);
        } catch (error: any) {
          console.error("Error uploading image:", error);
          alert(
            error.message ||
              "Failed to upload image. Please check your Supabase Storage setup."
          );
          setUploading(false);
          setLoading(false);
          return;
        }
        setUploading(false);
      }

      // Validate that we have an image URL
      if (!imageUrl) {
        alert("Please provide an image URL or upload an image file");
        setLoading(false);
        return;
      }

      // Find the category_id from the selected subcategory
      const selectedSubcategoryObj = subcategories.find(s => s.id === selectedSubcategory);
      if (!selectedSubcategoryObj) {
        alert("Invalid subcategory selected. Please select a valid subcategory.");
        setLoading(false);
        return;
      }

      // Update data with the image URL, subcategory_id, and category_id
      const productData: ProductInsert = {
        ...data,
        subcategory_id: selectedSubcategory || data.subcategory_id, // Ensure it's set
        category_id: selectedSubcategoryObj.category_id, // Derive category_id from subcategory
        preview_image: imageUrl,
      };

      // Final validation - ensure subcategory_id and category_id are present
      if (!productData.subcategory_id) {
        alert("Please select a subcategory before saving");
        setLoading(false);
        return;
      }
      if (!productData.category_id) {
        alert("Unable to determine category. Please select a subcategory.");
        setLoading(false);
        return;
      }

      if (product) {
        await updateProduct(product.id, productData);
      } else {
        await createProduct(productData);
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error saving product:", error);
      if (error?.message?.includes("null value") || 
          error?.message?.includes("category_id") || 
          error?.message?.includes("subcategory_id")) {
        alert("Please select a category and subcategory before saving the product.");
      } else {
        alert("Failed to save product. Please try again.");
      }
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          {...register("title", { required: "Title is required" })}
          placeholder="Product title"
        />
        {errors.title && (
          <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="category">Category *</Label>
        <Select
          value={selectedCategory}
          onValueChange={(value) => {
            setSelectedCategory(value);
            setSelectedSubcategory(""); // Reset subcategory when category changes
          }}
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
          <p className="text-sm text-red-500 mt-1">Category is required</p>
        )}
      </div>

      <div>
        <Label htmlFor="subcategory">Subcategory *</Label>
        <Select
          value={selectedSubcategory}
          onValueChange={setSelectedSubcategory}
          disabled={!selectedCategory}
        >
          <SelectTrigger>
            <SelectValue placeholder={selectedCategory ? "Select a subcategory" : "Select a category first"} />
          </SelectTrigger>
          <SelectContent>
            {filteredSubcategories.map((subcategory) => (
              <SelectItem key={subcategory.id} value={subcategory.id}>
                {subcategory.icon || "📦"} {getSubcategoryDisplayName(subcategory)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!selectedSubcategory && selectedCategory && (
          <p className="text-sm text-red-500 mt-1">Subcategory is required</p>
        )}
        {!selectedCategory && (
          <p className="text-sm text-gray-500 mt-1">Please select a category first</p>
        )}
      </div>

      <div>
        <Label htmlFor="price">Price (₹) *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          {...register("price", {
            required: "Price is required",
            min: { value: 0, message: "Price must be positive" },
            valueAsNumber: true,
          })}
          placeholder="50"
        />
        {errors.price && (
          <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...register("description", { required: "Description is required" })}
          placeholder="Product description"
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="preview_image">Preview Image *</Label>
        
        {/* Method Selection */}
        <div className="flex gap-2 mb-3">
          <Button
            type="button"
            variant={imageMethod === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => handleImageMethodChange("url")}
          >
            Enter URL
          </Button>
          <Button
            type="button"
            variant={imageMethod === "upload" ? "default" : "outline"}
            size="sm"
            onClick={() => handleImageMethodChange("upload")}
          >
            Upload Image
          </Button>
        </div>

        {/* URL Input */}
        {imageMethod === "url" && (
          <div>
            <Input
              id="preview_image"
              type="url"
              {...register("preview_image", {
                validate: (value) => {
                  if (imageMethod === "url" && !value) {
                    return "Preview image URL is required";
                  }
                  if (value && !/^https?:\/\/.+/.test(value)) {
                    return "Please enter a valid URL";
                  }
                  return true;
                },
              })}
              placeholder="https://example.com/image.jpg"
            />
            {errors.preview_image && (
              <p className="text-sm text-red-500 mt-1">{errors.preview_image.message}</p>
            )}
          </div>
        )}

        {/* File Upload */}
        {imageMethod === "upload" && (
          <div>
            <Input
              ref={fileInputRef}
              id="preview_image_file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {!selectedFile && (
              <p className="text-sm text-gray-500 mt-1">
                Please select an image file (max 5MB)
              </p>
            )}
            {selectedFile && (
              <p className="text-sm text-green-600 mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        )}

        {/* Image Preview */}
        {previewUrl && (
          <div className="mt-3">
            <Label className="text-sm text-gray-600 mb-2 block">Preview:</Label>
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-48 h-48 object-cover rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading || uploading}>
          {uploading
            ? "Uploading..."
            : loading
            ? "Saving..."
            : product
            ? "Update Product"
            : "Create Product"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
