type FileLike = {
  name?: string;
  size?: number;
  type?: string;
};

export type CompressionResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
  usedOriginal: boolean;
  message: string;
};

export type CompressionOptions = {
  maxWidth?: number;
  targetBytes?: number;
  minQuality?: number;
};

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const defaultMaxWidth = 1800;
const defaultTargetBytes = 2 * 1024 * 1024;
const defaultMinQuality = 0.72;

export function isSupportedImageType(type: string | undefined) {
  return supportedImageTypes.has(type ?? "");
}

export function getImageExtension(file: Pick<FileLike, "name" | "type">) {
  const fromName = file.name?.split(".").pop()?.toLowerCase();

  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function shouldAttemptCompression(file: Pick<FileLike, "size" | "type">) {
  return isSupportedImageType(file.type) && (file.size ?? 0) > defaultTargetBytes;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {},
): Promise<CompressionResult> {
  const originalSize = file.size;
  const maxWidth = options.maxWidth ?? defaultMaxWidth;
  const targetBytes = options.targetBytes ?? defaultTargetBytes;
  const minQuality = options.minQuality ?? defaultMinQuality;

  if (!shouldAttemptCompression(file)) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      usedOriginal: true,
      message: "图片大小合适，已保留原图清晰度。",
    };
  }

  try {
    const image = await loadImage(file);
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("浏览器不支持图片压缩画布。");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let bestBlob: Blob | null = null;
    for (const quality of [0.92, 0.86, 0.8, 0.74, minQuality]) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (!blob) {
        continue;
      }

      bestBlob = blob;
      if (blob.size <= targetBytes || quality <= minQuality) {
        break;
      }
    }

    if (!bestBlob || bestBlob.size >= originalSize) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        usedOriginal: true,
        message: "压缩后没有更小，已使用原图上传。",
      };
    }

    const compressedFile = new File(
      [bestBlob],
      file.name.replace(/\.(jpe?g|png|webp)$/i, "") + ".jpg",
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      },
    );

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      usedOriginal: false,
      message: `已压缩：${formatFileSize(originalSize)} -> ${formatFileSize(compressedFile.size)}`,
    };
  } catch {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      usedOriginal: true,
      message: "压缩失败，已使用原图上传。",
    };
  }
}
