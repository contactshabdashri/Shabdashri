const MAX_DIMENSION_PX = 1600;
const TARGET_MAX_SIZE_BYTES = 1.5 * 1024 * 1024;
const OUTPUT_QUALITY = 0.82;

const SKIP_OPTIMIZATION_TYPES = new Set(["image/gif", "image/svg+xml"]);

export interface OptimizedUploadImage {
  file: File;
  optimized: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    image.src = objectUrl;
  });
}

function getScaledSize(width: number, height: number) {
  const largestDimension = Math.max(width, height);

  if (largestDimension <= MAX_DIMENSION_PX) {
    return { width, height };
  }

  const scale = MAX_DIMENSION_PX / largestDimension;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function replaceFileExtension(fileName: string, extension: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  const baseName = lastDotIndex >= 0 ? fileName.slice(0, lastDotIndex) : fileName;
  return `${baseName}.${extension}`;
}

export async function optimizeImageForUpload(file: File): Promise<OptimizedUploadImage> {
  if (SKIP_OPTIMIZATION_TYPES.has(file.type)) {
    return { file, optimized: false };
  }

  const image = await loadImage(file);
  const { width, height } = getScaledSize(image.naturalWidth, image.naturalHeight);
  const shouldResize = width !== image.naturalWidth || height !== image.naturalHeight;
  const shouldCompress = file.size > TARGET_MAX_SIZE_BYTES;

  if (!shouldResize && !shouldCompress) {
    return { file, optimized: false };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare the selected image for upload.");
  }

  context.drawImage(image, 0, 0, width, height);

  const optimizedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", OUTPUT_QUALITY);
  });

  if (!optimizedBlob || optimizedBlob.size >= file.size) {
    return { file, optimized: false };
  }

  return {
    file: new File([optimizedBlob], replaceFileExtension(file.name, "webp"), {
      type: "image/webp",
      lastModified: Date.now(),
    }),
    optimized: true,
  };
}
