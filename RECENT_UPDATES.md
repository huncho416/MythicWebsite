# Recent Updates - Registration Username Fix & Discord Widget

## Changes Made

### 1. Fixed Registration Username Bug
- **Issue**: When users signed up with a unique username, the system was using their email's username instead of the one they entered.
- **Root Cause**: The auto-create profile trigger in the database was prioritizing email username over the signup metadata username.
- **Fix**: 
  - Created new migration `20250817000012_fix_registration_username.sql` that updates the `handle_new_user()` function
  - Removed `display_name` from the profile creation logic
  - Updated the function to properly use `NEW.raw_user_meta_data->>'username'` from the signup process
  - Simplified the registration process in `Login.tsx` to rely on the database trigger instead of manual profile creation

### 2. Added Discord Widget to Homepage
- **Feature**: Added a Discord server widget under the "Recent Purchases" section on the homepage
- **Implementation**: 
  - Added a new card with an iframe that displays the Discord server widget
  - Uses `https://discord.com/widget?id=XXXXXXXXXXXXXXXXX&theme=dark` format
  - Currently has a placeholder server ID that needs to be replaced with your actual Discord server ID
  - Includes proper sandbox attributes for security
  - Added a helpful note for server ID replacement

### 3. Files Modified
- `src/pages/Login.tsx` - Simplified registration to rely on database trigger
- `src/pages/Index.tsx` - Added Discord widget card after Recent Purchases
- `supabase/migrations/20250817000012_fix_registration_username.sql` - New migration to fix the username bug

### 4. To Complete Setup
1. **Discord Widget**: Replace `1234567890123456789` in the Discord widget iframe src with your actual Discord server ID
2. **Database Migration**: Apply the new migration to your production database when ready
3. **Test Registration**: Test the registration flow to ensure usernames are now properly saved

## Technical Notes
- The build passes successfully with no TypeScript errors
- Development server runs without issues
- All changes maintain backward compatibility
- The Discord widget is responsive and matches the site's design theme
