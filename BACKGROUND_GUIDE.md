# 🎮 Minecraft Background Configuration Guide

This guide explains how to customize the homepage background image for your MythicPvP website.

## 📋 Quick Setup

### Option 1: Use Your Own Minecraft Screenshot
1. Take a high-quality screenshot in Minecraft (preferably with shaders)
2. Save it as `public/minecraft-background.jpg`
3. Refresh your website - the new background will load automatically!

### Option 2: Generate a Placeholder
1. Open `generate-background.html` in your browser
2. Click "Generate Minecraft Landscape"
3. Right-click and save the image as `public/minecraft-background.jpg`

## 🎨 Image Requirements

### Recommended Specifications
- **Resolution**: 1920x1080 minimum, 2560x1440 preferred
- **Format**: JPG or WebP
- **File size**: Under 500KB (use compression if needed)
- **Aspect ratio**: 16:9 or wider
- **Quality**: High resolution for crisp display on all devices

### Content Guidelines
- Choose scenes with good contrast (text needs to be readable)
- Avoid overly busy compositions
- Consider how the purple overlay will affect colors
- Landscape orientations work best
- Screenshots with depth and perspective are ideal

## 🔧 Advanced Configuration

### Changing the Background Image
Edit `src/config/background.ts`:

```typescript
export const BACKGROUND_CONFIG = {
  // Change this to your new image
  IMAGE_URL: '/your-new-background.jpg',
  
  // Multiple background options
  ALTERNATIVE_IMAGES: [
    '/minecraft-landscape-1.jpg',
    '/minecraft-cityscape.jpg',
    '/minecraft-nether.jpg',
  ]
};
```

### Custom Overlay Settings
Adjust the overlay opacity and colors in the same file:

```typescript
OVERLAY: {
  light: {
    gradient: 'linear-gradient(...)', // Custom gradient
    opacity: 0.85 // Adjust transparency
  }
}
```

## 📱 Responsive Behavior

The background automatically adapts to different screen sizes:

- **Desktop**: Fixed attachment for parallax effect
- **Mobile**: Scroll attachment for better performance
- **Tablet**: Optimized sizing and positioning

## 🛠️ Troubleshooting

### Background Not Loading
1. Check that the image file exists in `/public/`
2. Verify the file name matches the configuration
3. Ensure the image format is supported (JPG, PNG, WebP)
4. Check browser console for error messages

### Performance Issues
1. Compress large images before uploading
2. Use WebP format for better compression
3. Consider multiple sizes for different devices

### Text Readability
1. Adjust overlay opacity in `background.ts`
2. Choose backgrounds with good contrast
3. Test on both light and dark modes

## 🎯 Best Practices

### Image Selection
- Use in-game screenshots for authenticity
- Consider shader packs for enhanced visuals
- Avoid copyrighted content
- Test with your website's color scheme

### Performance Optimization
- Optimize images before uploading
- Use lazy loading for additional backgrounds
- Consider CDN hosting for faster loading
- Monitor Core Web Vitals impact

### Accessibility
- Ensure sufficient contrast for text
- Provide fallbacks for failed image loads
- Test with various display settings

## 🔄 Updating Process

### Regular Updates
1. Add new images to `/public/` folder
2. Update `BACKGROUND_CONFIG.IMAGE_URL`
3. Test on different devices and browsers
4. Monitor loading performance

### Seasonal Themes
Create themed backgrounds for different seasons or events:
- Holiday-themed builds
- Seasonal landscapes (snow, autumn, etc.)
- Special event screenshots
- Community build showcases

## 📖 Example Configurations

### Single Background
```typescript
export const BACKGROUND_CONFIG = {
  IMAGE_URL: '/minecraft-epic-landscape.jpg'
};
```

### Rotating Backgrounds
```typescript
export const BACKGROUND_CONFIG = {
  IMAGE_URL: '/current-background.jpg',
  ALTERNATIVE_IMAGES: [
    '/background-summer.jpg',
    '/background-winter.jpg',
    '/background-nether.jpg'
  ]
};
```

### Dynamic Selection
Implement time-based or random background selection by modifying the hook in `src/hooks/use-background.ts`.

---

Need help? Check the troubleshooting section or create an issue on GitHub!
