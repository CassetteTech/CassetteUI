import 'package:cassettefrontend/core/common_widgets/error_page.dart';
import 'package:cassettefrontend/feature/auth/pages/sign_in_page.dart';
import 'package:cassettefrontend/feature/auth/pages/sign_up_page.dart';
import 'package:cassettefrontend/feature/home/pages/home_page.dart';
import 'package:cassettefrontend/feature/profile/pages/add_music_page.dart';
import 'package:cassettefrontend/feature/profile/pages/edit_profile_page.dart';
import 'package:cassettefrontend/feature/profile/pages/profile_page.dart';
import 'package:cassettefrontend/feature/media/pages/collection_page.dart';
import 'package:cassettefrontend/feature/media/pages/entity_page.dart';
import 'package:cassettefrontend/feature/media/pages/post_page.dart';
import 'package:cassettefrontend/main.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cassettefrontend/spotify_callback_page.dart';
import 'package:cassettefrontend/core/services/api_service.dart';
import 'package:cassettefrontend/core/services/auth_service.dart';

class AppRouter {
  static final _authService = AuthService();
  static String? _lastRedirectLocation;
  static DateTime? _lastRedirectTime;
  static const _redirectThrottle = Duration(milliseconds: 500);

  static GoRouter getRouter(bool isAuth) {
    return GoRouter(
      initialLocation: '/',
      debugLogDiagnostics: true,
      refreshListenable: _authService, // Listen to auth state changes
      redirect: (context, state) async {
        final location = state.matchedLocation;
        final now = DateTime.now();
        
        print('🔄 [Router] Redirect called for $location');

        if (state.matchedLocation == '/spotify_callback') {
          print(
              '✅ [Router] Allowing /spotify_callback to pass through redirect guard.');
          return null; // null means no redirect, proceed to the route's builder
        }

        // Get current auth state using cached data first
        final user = await _authService.getCurrentUser();
        final isAuthenticated = user != null;
        print(
            '🔐 [Router] isAuthenticated (from cache/check): $isAuthenticated');


        final isSigningIn = location == '/signin';
        final isSigningUp = location == '/signup';
        final isHome = location == '/';
        final isEditProfile = location == '/profile/edit';
        final isProfile = location == '/profile';

        print('📍 [Router] Route info - isSigningIn: $isSigningIn, isSigningUp: $isSigningUp, isHome: $isHome, isEditProfile: $isEditProfile, isProfile: $isProfile');

        // Check if the current route is a public route
        final isPublicRoute = isHome ||
            isSigningIn ||
            isSigningUp ||
            location.startsWith('/track/') ||
            location.startsWith('/artist/') ||
            location.startsWith('/album/') ||
            location.startsWith('/playlist/') ||
            location.startsWith('/post') ||
            location.startsWith('/p/');

        print('🌐 [Router] isPublicRoute: $isPublicRoute');

        // Handle unauthenticated user
        if (!isAuthenticated) {
          print('❌ [Router] User not authenticated');
          // Allow access to public routes
          if (isPublicRoute) {
            print('✅ [Router] Allowing access to public route');
            return null;
          }
          // Redirect to signin for protected routes
          print('🔒 [Router] Redirecting to signin');
          _lastRedirectLocation = '/signin';
          _lastRedirectTime = now;
          return '/signin';
        }
        // User is authenticated
        if (isSigningIn || isSigningUp) {
          print('🔐 [Router] User is authenticated and on auth route');
          // Go directly to profile

          print('👤 [Router] Redirecting to profile');
          _lastRedirectLocation = '/profile';
          _lastRedirectTime = now;
          return '/profile';
        } else if (isHome) {
          print('🔐 [Router] User is authenticated and on home route');
          print('👤 [Router] Redirecting to profile');
          _lastRedirectLocation = '/profile';
          _lastRedirectTime = now;
          return '/profile';
        }

        // If user is authenticated and on home page, allow access
        if (isHome) {
          print('🏠 [Router] User is authenticated and on home page');
          return null;
        }

        print('✅ [Router] No redirect needed');
        // No redirect needed
        return null;
      },
      routes: [
        GoRoute(
          name: 'home',
          path: '/',
          builder: (context, state) => const HomePage(),
        ),
        GoRoute(
          name: 'spotify_callback',
          path: '/spotify_callback',
          builder: (context, state) {
            final code = state.uri.queryParameters['code'];
            final error = state.uri.queryParameters['error'];
            return SpotifyCallbackPage(code: code, error: error);
          },
        ),
        GoRoute(
          name: 'profile',
          path: '/profile',
          builder: (context, state) {
            return FutureBuilder<Map<String, dynamic>?>(
              future: _authService.getCurrentUser(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Scaffold(
                    body: Center(child: CircularProgressIndicator()),
                  );
                }

                final userData = snapshot.data;
                if (userData == null) {
                  print('❌ [Router] No user data available after timeout');
                  // Don't redirect here - let the router handle it
                  return const Scaffold(
                    body: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CircularProgressIndicator(),
                          SizedBox(height: 16),
                          Text('Loading profile...'),
                        ],
                      ),
                    ),
                  );
                }

                // Try to get user ID in order of preference
                final userId = userData['userId'] ??
                    userData['id'] ??
                    userData['authUserId'];

                print('✅ [Router] Loading profile for user ID: $userId');
                print(
                    '📝 [Router] Available user data: ${userData.keys.join(', ')}');

                if (userId == null) {
                  print('❌ [Router] No valid user ID found in data');
                  // Don't redirect here - let the router handle it
                  return const Scaffold(
                    body: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline, size: 48, color: Colors.red),
                          SizedBox(height: 16),
                          Text('Profile loading error'),
                          Text('Please try refreshing'),
                        ],
                      ),
                    ),
                  );
                }

                return ProfilePage(userIdentifier: userId.toString());
              },
            );
          },
        ),
        GoRoute(
          name: 'edit_profile',
          path: '/profile/edit',
          builder: (context, state) => const EditProfilePage(),
        ), // **needs to be defined before /profile/:identifier otherwise it will match "edit" as a profile identifier**
        GoRoute(
          name: 'user_profile',
          path: '/profile/:identifier',
          builder: (context, state) {
            final identifier = state.pathParameters['identifier']!;
            return ProfilePage(userIdentifier: identifier);
          },
        ),
        // Media routes for different types
        GoRoute(
          name: 'track',
          path: '/track/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'];
            final postData = state.extra as Map<String, dynamic>?;

            // If we have postData, use it directly
            if (postData != null) {
              print('Route /track/$id: Using provided postData');
              return EntityPage(
                type: 'track',
                trackId: postData['musicElementId'] as String?,
                postId: id,
                postData: postData,
              );
            }

            // If no postData, determine if this is a post ID or track ID
            print(
                'Route /track/$id: No postData provided, determining ID type');
            if (id != null && id.startsWith('p_')) {
              print('Route /track/$id: ID appears to be a post ID');
              // This appears to be a post ID, we'll load data in EntityPage
              return EntityPage(
                type: 'track',
                trackId: null,
                postId: id,
              );
            }

            // Fallback - treat as a track ID directly
            print('Route /track/$id: Treating as direct track ID');
            return EntityPage(
              type: 'track',
              trackId: id,
              postId: id,
            );
          },
        ),
        GoRoute(
          name: 'artist',
          path: '/artist/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'];
            final postData = state.extra as Map<String, dynamic>?;

            // If we have postData, use it directly
            if (postData != null) {
              print('Route /artist/$id: Using provided postData');
              return EntityPage(
                type: 'artist',
                trackId: postData['musicElementId'] as String?,
                postId: id,
                postData: postData,
              );
            }

            // If no postData, determine if this is a post ID or artist ID
            print(
                'Route /artist/$id: No postData provided, determining ID type');
            if (id != null && id.startsWith('p_')) {
              print('Route /artist/$id: ID appears to be a post ID');
              // This appears to be a post ID, we'll load data in EntityPage
              return EntityPage(
                type: 'artist',
                trackId: null,
                postId: id,
              );
            }

            // Fallback - treat as an artist ID directly
            print('Route /artist/$id: Treating as direct artist ID');
            return EntityPage(
              type: 'artist',
              trackId: id,
              postId: id,
            );
          },
        ),
        GoRoute(
          name: 'album',
          path: '/album/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'];
            final postData = state.extra as Map<String, dynamic>?;

            // If we have postData, use it directly
            if (postData != null) {
              print('Route /album/$id: Using provided postData');
              return CollectionPage(
                type: 'album',
                trackId: postData['musicElementId'] as String?,
                postId: id,
                postData: postData,
              );
            }

            // If no postData, determine if this is a post ID or album ID
            print(
                'Route /album/$id: No postData provided, determining ID type');
            if (id != null && id.startsWith('p_')) {
              print('Route /album/$id: ID appears to be a post ID');
              // This appears to be a post ID, we'll load data in CollectionPage
              return CollectionPage(
                type: 'album',
                trackId: null,
                postId: id,
              );
            }

            // Fallback - treat as an album ID directly
            print('Route /album/$id: Treating as direct album ID');
            return CollectionPage(
              type: 'album',
              trackId: id,
              postId: id,
            );
          },
        ),
        GoRoute(
          name: 'playlist',
          path: '/playlist/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'];
            final postData = state.extra as Map<String, dynamic>?;

            // If we have postData, use it directly
            if (postData != null) {
              print('Route /playlist/$id: Using provided postData');
              return CollectionPage(
                type: 'playlist',
                trackId: postData['musicElementId'] as String?,
                postId: id,
                postData: postData,
              );
            }

            // If no postData, determine if this is a post ID or playlist ID
            print(
                'Route /playlist/$id: No postData provided, determining ID type');
            if (id != null && id.startsWith('p_')) {
              print('Route /playlist/$id: ID appears to be a post ID');
              // This appears to be a post ID, we'll load data in CollectionPage
              return CollectionPage(
                type: 'playlist',
                trackId: null,
                postId: id,
              );
            }

            // Fallback - treat as a playlist ID directly
            print('Route /playlist/$id: Treating as direct playlist ID');
            return CollectionPage(
              type: 'playlist',
              trackId: id,
              postId: id,
            );
          },
        ),
        // GoRoute(
        //   path: '/track/:trackId',
        //   builder: (context, state) => TrackPage(trackId: state.pathParameters['trackId']!),
        // ),
        GoRoute(
          name: 'signup',
          path: '/signup',
          builder: (context, state) => const SignUpPage(),
        ),
        GoRoute(
          name: 'signin',
          path: '/signin',
          builder: (context, state) => const SignInPage(),
        ),
        GoRoute(
          name: 'add_music',
          path: '/add_music',
          builder: (context, state) => const AddMusicPage(),
        ),
        GoRoute(
          name: 'post',
          path: '/post',
          builder: (context, state) {
            print('===== GoRouter /post route =====');
            final postData = state.extra as Map<String, dynamic>?;
            print('Router received extra data: $postData');

            if (postData == null) {
              print('ERROR: No extra data provided to post route');
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline,
                          color: Colors.red, size: 48),
                      const SizedBox(height: 16),
                      Text(
                        'Error: No data provided',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Could not load music information. Please try again.',
                        style: Theme.of(context).textTheme.bodyMedium,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            }

            print('Creating PostPage with data: $postData');
            return PostPage(postData: postData);
          },
        ),
        GoRoute(
          name: 'post_with_id',
          path: '/p/:postId',
          builder: (context, state) {
            print('===== GoRouter /p/:postId route =====');
            final postId = state.pathParameters['postId'];
            final postData = state.extra as Map<String, dynamic>?;
            print('Router received postId: $postId');
            print('Router received extra data: $postData');

            // If we have data in extra, use it directly
            if (postData != null) {
              print(
                  'Creating PostPage with existing postData and postId: $postId');
              // Make sure the postId from the URL is used
              final updatedData = Map<String, dynamic>.from(postData);
              updatedData['postId'] = postId;
              return PostPage(postData: updatedData);
            }

            // If no data is provided, create minimal data with postId
            print('Creating PostPage with minimal data and postId: $postId');
            return PostPage(postData: {'postId': postId});
          },
        ),
      ],
      errorPageBuilder: (context, state) => MaterialPage(child: ErrorPage()),
    );
  }
}
