# Testing the Music Conversion Flow

## Test Scenarios

### 1. Homepage Music Link Conversion
1. Open http://localhost:3001
2. Paste a music link (e.g., Spotify track URL) in the search bar
3. Verify that:
   - Loading indicator appears immediately
   - Navigation to `/post` page happens
   - Skeleton loader shows while data loads
   - Entity page displays with correct information

### 2. Search Results Selection
1. Open http://localhost:3001
2. Type a search query (e.g., "Best Part Daniel Caesar")
3. Click on a search result
4. Verify conversion and navigation to post page

### 3. Collections Page
1. Navigate to http://localhost:3001/collections
2. Click on any collection item
3. Verify that it navigates to the post page with the item details

### 4. Post Page Features
- Cover art displays correctly with shadow effect
- Streaming links are shown in a grid
- Audio preview button appears for tracks (not artists)
- Responsive layout works on mobile and desktop
- Back button navigates correctly

### 5. Error Handling
1. Navigate directly to `/post` without data
2. Verify error state displays properly
3. Test "Go Back" button functionality

## Sample Music URLs for Testing
- Spotify Track: https://open.spotify.com/track/[trackId]
- Apple Music: https://music.apple.com/us/song/[songName]/[songId]
- Deezer: https://www.deezer.com/track/[trackId]

## Expected Flow
1. User pastes link → Show loading state → Navigate to post page
2. Post page shows skeleton → API converts link → Display entity data
3. User can play preview (if available) and access all streaming platforms