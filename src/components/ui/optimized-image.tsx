import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

interface ImageFormat {
  src: string;
  type: string;
}

/**
 * Generates optimized image sources for different formats
 */
function generateImageSources(src: string, _quality: number = 80): ImageFormat[] {
  const basePath = src.replace(/\.[^/.]+$/, ''); // Remove extension
  const isOptimizedPath = src.includes('/optimized/');
  const optimizedBasePath = isOptimizedPath
    ? basePath
    : `/optimized/${basePath.replace(/^\//, '')}`;

  return [
    {
      src: `${optimizedBasePath}.avif`,
      type: 'image/avif',
    },
    {
      src: `${optimizedBasePath}.webp`,
      type: 'image/webp',
    },
    {
      src: `${optimizedBasePath}.optimized.png`,
      type: 'image/png',
    },
    {
      src, // Fallback to original
      type: 'image/png',
    },
  ];
}

/**
 * Optimized Image Component with modern format support
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
  priority = false,
  sizes,
  quality = 80,
  placeholder = 'empty',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [_currentSrc, _setCurrentSrc] = useState<string>('');

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  const imageSources = generateImageSources(src, quality);

  // Generate srcSet for responsive images
  const generateSrcSet = (baseSrc: string) => {
    if (!width || !height) return baseSrc;

    const sizes = [1, 1.5, 2]; // 1x, 1.5x, 2x
    return sizes
      .map(scale => {
        // Note: scaledWidth and scaledHeight could be used for actual image optimization
        return `${baseSrc} ${scale}x`;
      })
      .join(', ');
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <div className='absolute inset-0 bg-muted animate-pulse' style={{ width, height }} />
      )}

      {/* Main Image with Picture element for format fallbacks */}
      <picture>
        {imageSources.map((source, index) => {
          // Skip the last source (original fallback) for source elements
          if (index === imageSources.length - 1) return null;

          return (
            <source
              key={source.type}
              srcSet={generateSrcSet(source.src)}
              type={source.type}
              sizes={sizes}
            />
          );
        })}

        <img
          src={imageSources[imageSources.length - 1]?.src || ''} // Fallback image
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : loading}
          sizes={sizes}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            hasError && 'opacity-50'
          )}
          onLoad={handleLoad}
          onError={handleError}
          decoding='async'
        />
      </picture>

      {/* Error state */}
      {hasError && (
        <div className='absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm'>
          Failed to load image
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && !hasError && loading === 'lazy' && (
        <div className='absolute inset-0 flex items-center justify-center bg-muted'>
          <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
        </div>
      )}
    </div>
  );
}

/**
 * Favicon component with optimized formats
 */
interface FaviconProps {
  size?: 16 | 32 | 180 | 192 | 512;
  className?: string;
}

export function Favicon({ size = 32, className }: FaviconProps) {
  const getIconPath = (size: number) => {
    switch (size) {
      case 16:
        return '/optimized/favicon-16x16';
      case 32:
        return '/optimized/favicon-32x32';
      case 180:
        return '/optimized/apple-touch-icon';
      case 192:
        return '/optimized/android-chrome-192x192';
      case 512:
        return '/optimized/android-chrome-512x512';
      default:
        return '/optimized/favicon-32x32';
    }
  };

  const basePath = getIconPath(size);

  return (
    <OptimizedImage
      src={`${basePath}.png`}
      alt='TSConv Favicon'
      width={size}
      height={size}
      className={className}
      loading='eager'
      priority={true}
    />
  );
}

/**
 * Logo component with optimized formats
 */
interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const logoSizes = {
  sm: { width: 32, height: 32 },
  md: { width: 64, height: 64 },
  lg: { width: 128, height: 128 },
  xl: { width: 256, height: 256 },
};

export function Logo({ size = 'md', className }: LogoProps) {
  const { width, height } = logoSizes[size];

  return (
    <OptimizedImage
      src='/optimized/tsconv_logo.png'
      alt='TSConv Logo'
      width={width}
      height={height}
      className={className}
      loading='eager'
      priority={true}
    />
  );
}

/**
 * Hook for preloading images
 */
export function useImagePreload(src: string, quality: number = 80) {
  const preloadImage = useCallback(() => {
    const sources = generateImageSources(src, quality);

    sources.forEach(source => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = source.src;
      link.type = source.type;
      document.head.appendChild(link);
    });
  }, [src, quality]);

  return preloadImage;
}

/**
 * Utility function to check if WebP is supported
 */
export function checkWebPSupport(): Promise<boolean> {
  return new Promise(resolve => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Utility function to check if AVIF is supported
 */
export function checkAVIFSupport(): Promise<boolean> {
  return new Promise(resolve => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
}
