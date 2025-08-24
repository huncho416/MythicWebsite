import { useEffect, useState } from 'react';
import { BACKGROUND_CONFIG } from '@/config/background';

/**
 * Hook to handle background image loading with fallback support
 */
export const useBackgroundImage = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    
    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
      console.warn(`Failed to load background image: ${BACKGROUND_CONFIG.IMAGE_URL}`);
    };
    
    img.src = BACKGROUND_CONFIG.IMAGE_URL;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, []);

  return { imageLoaded, imageError };
};

/**
 * Hook to generate dynamic background CSS
 */
export const useBackgroundCSS = (theme: 'light' | 'dark' = 'light') => {
  const { imageLoaded, imageError } = useBackgroundImage();
  
  const overlayConfig = BACKGROUND_CONFIG.OVERLAY[theme];
  
  const backgroundImage = imageError 
    ? `${overlayConfig.gradient}, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><pattern id="blocks" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="%232d1b69"/><rect x="0" y="0" width="16" height="16" fill="%23553c9a"/><rect x="16" y="16" width="16" height="16" fill="%23553c9a"/></pattern></defs><rect width="128" height="128" fill="url(%23blocks)"/></svg>')`
    : `${overlayConfig.gradient}, url('${BACKGROUND_CONFIG.IMAGE_URL}')`;
  
  return {
    backgroundImage,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: window.innerWidth <= 768 
      ? BACKGROUND_CONFIG.RESPONSIVE.mobile.backgroundAttachment
      : BACKGROUND_CONFIG.RESPONSIVE.desktop.backgroundAttachment,
    imageLoaded,
    imageError
  };
};
