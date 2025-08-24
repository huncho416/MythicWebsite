/**
 * Background Image Configuration
 * 
 * This file contains configuration for the homepage background image.
 * Update the IMAGE_URL to change the Minecraft background easily.
 */

export const BACKGROUND_CONFIG = {
  // Main Minecraft background image
  IMAGE_URL: '/minecraft-background.jpg',
  
  // Alternative Minecraft backgrounds (uncomment to use)
  ALTERNATIVE_IMAGES: [
    '/minecraft-landscape-1.jpg',    // Epic mountain landscape
    '/minecraft-landscape-2.jpg',    // Sunset over plains
    '/minecraft-landscape-3.jpg',    // Snowy mountain peaks
    '/minecraft-cityscape.jpg',      // Player-built city
    '/minecraft-nether.jpg',         // Nether landscape
    '/minecraft-end.jpg',            // End dimension
  ],
  
  // Overlay configuration
  OVERLAY: {
    light: {
      gradient: 'linear-gradient(135deg, rgba(45, 35, 75, 0.75) 0%, rgba(35, 25, 65, 0.85) 50%, rgba(25, 15, 55, 0.90) 100%)',
      opacity: 0.85
    },
    dark: {
      gradient: 'linear-gradient(135deg, rgba(45, 35, 75, 0.80) 0%, rgba(35, 25, 65, 0.90) 50%, rgba(25, 15, 55, 0.95) 100%)',
      opacity: 0.90
    }
  },
  
  // Responsive configuration
  RESPONSIVE: {
    mobile: {
      backgroundAttachment: 'scroll',
      backgroundSize: 'cover'
    },
    desktop: {
      backgroundAttachment: 'fixed',
      backgroundSize: 'cover'
    }
  }
};

/**
 * Instructions for updating the background:
 * 
 * 1. Add your Minecraft screenshot/landscape to the /public folder
 * 2. Update IMAGE_URL above to point to your new image
 * 3. Ensure the image is high resolution (1920x1080 or higher)
 * 4. Test on different screen sizes to ensure it looks good
 * 
 * Recommended image specifications:
 * - Format: JPG or WebP
 * - Resolution: 1920x1080 minimum, 2560x1440 recommended
 * - File size: Under 500KB (use compression tools if needed)
 * - Aspect ratio: 16:9 or wider
 */
