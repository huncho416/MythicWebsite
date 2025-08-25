/**
 * Utility functions for Minecraft player operations
 */

/**
 * Generate Minecraft player head URL from username
 * Uses mc-heads.net service which provides player head images
 * @param username - Minecraft username
 * @param size - Image size (default: 64px)
 * @returns URL to player head image
 */
export function getMinecraftPlayerHead(username: string, size: number = 64): string {
  if (!username || username.trim() === '') {
    return `https://mc-heads.net/avatar/MHF_Steve/${size}`;
  }
  
  // Clean username (remove any invalid characters)
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_]/g, '');
  
  if (!cleanUsername) {
    return `https://mc-heads.net/avatar/MHF_Steve/${size}`;
  }
  
  return `https://mc-heads.net/avatar/${cleanUsername}/${size}`;
}

/**
 * Check if a Minecraft username is valid
 * @param username - Username to validate
 * @returns True if valid, false otherwise
 */
export function isValidMinecraftUsername(username: string): boolean {
  // Minecraft username validation:
  // - 3-16 characters
  // - Only letters, numbers, and underscores
  // - Cannot start or end with underscore
  const regex = /^[a-zA-Z0-9_]{3,16}$/;
  const startsOrEndsWithUnderscore = username.startsWith('_') || username.endsWith('_');
  
  return regex.test(username) && !startsOrEndsWithUnderscore;
}
