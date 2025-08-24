#!/bin/bash

# Minecraft Background Image Setup Script
# This script helps you add a proper Minecraft background image

echo "🎮 MythicPvP Minecraft Background Setup"
echo "======================================="
echo ""

echo "📋 To add a Minecraft background image:"
echo ""
echo "1. Find a high-quality Minecraft screenshot or landscape:"
echo "   - Resolution: 1920x1080 minimum (2560x1440 recommended)"
echo "   - Format: JPG or WebP"
echo "   - File size: Under 500KB"
echo "   - Aspect ratio: 16:9 or wider"
echo ""

echo "2. Recommended sources for Minecraft backgrounds:"
echo "   - Take your own in-game screenshots"
echo "   - Use shader packs for enhanced visuals"
echo "   - Find royalty-free Minecraft landscapes"
echo "   - Community screenshots from r/Minecraft"
echo ""

echo "3. Save your image as: public/minecraft-background.jpg"
echo ""

echo "4. Alternative images you can add:"
echo "   - public/minecraft-landscape-1.jpg"
echo "   - public/minecraft-landscape-2.jpg"
echo "   - public/minecraft-cityscape.jpg"
echo "   - public/minecraft-nether.jpg"
echo ""

echo "5. To change the background, edit src/config/background.ts"
echo "   and update the IMAGE_URL property"
echo ""

echo "🎨 Tips for the best results:"
echo "   - Use images with interesting but not too busy compositions"
echo "   - Ensure there's contrast for white text to be readable"
echo "   - Test on different screen sizes"
echo "   - Consider the purple overlay when choosing colors"
echo ""

echo "✅ The website is already configured to use the background image."
echo "   Just add your minecraft-background.jpg file to the public folder!"

# Check if the background image exists
if [ -f "public/minecraft-background.jpg" ]; then
    echo ""
    echo "✅ Found: public/minecraft-background.jpg"
    echo "   Your Minecraft background is ready to use!"
else
    echo ""
    echo "⚠️  Not found: public/minecraft-background.jpg"
    echo "   Please add your Minecraft background image to use the new system."
fi
