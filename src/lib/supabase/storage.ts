import { supabase } from "../supabase";

const BUCKET_NAME = "product-images";

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param productId - Optional product ID for organizing files
 * @returns Public URL of the uploaded image
 */
export async function uploadProductImage(
  file: File,
  productId?: string
): Promise<string> {
  try {
    // Generate a unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = productId ? `${productId}/${fileName}` : fileName;

    // Upload the file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      // If bucket doesn't exist, provide helpful error message
      if (error.message.includes("Bucket not found")) {
        throw new Error(
          `Storage bucket "${BUCKET_NAME}" not found. Please create it in Supabase Dashboard → Storage.`
        );
      }
      throw error;
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

/**
 * Delete an image from Supabase Storage
 * @param imageUrl - The public URL of the image to delete
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  try {
    // Extract the file path from the URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const filePath = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join("/");

    if (!filePath) {
      console.warn("Could not extract file path from URL:", imageUrl);
      return;
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Error deleting image:", error);
      // Don't throw - deletion is not critical
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    // Don't throw - deletion is not critical
  }
}
