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

class AppRouter {
  static GoRouter getRouter(bool isAuth) {
    final GoRouter router = GoRouter(
      initialLocation: isAuthenticated ? '/profile' : '/',
      debugLogDiagnostics: true,
      navigatorKey: navigatorKey,
      routes: [
        GoRoute(
          name: 'home',
          path: '/',
          builder: (context, state) => HomePage(),
        ),
        GoRoute(
          name: 'spotify_callback',
          path: '/spotify_callback',
          builder: (context, state) {
            final code = state.uri.queryParameters['code'];
            final error = state.uri.queryParameters['error'];
            final stateParam = state.uri.queryParameters['state'];
            return SpotifyCallbackPage(code: code, error: error, state: stateParam);
          },
        ),
        GoRoute(
          name: 'profile',
          path: '/profile',
          builder: (context, state) {
            return const ProfilePage();
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
          pageBuilder: (context, state) {
            return CustomTransitionPage(
              key: state.pageKey,
              child: const SignUpPage(),
              transitionsBuilder:
                  (context, animation, secondaryAnimation, child) {
                return FadeTransition(
                  opacity: animation,
                  child: child,
                );
              },
            );
          },
        ),
        GoRoute(
          name: 'signin',
          path: '/signin',
          pageBuilder: (context, state) {
            return CustomTransitionPage(
              key: state.pageKey,
              child: const SignInPage(),
              transitionsBuilder:
                  (context, animation, secondaryAnimation, child) {
                return FadeTransition(
                  opacity: animation,
                  child: child,
                );
              },
            );
          },
        ),
        GoRoute(
          name: 'edit_profile',
          path: '/edit_profile',
          builder: (context, state) => const EditProfilePage(),
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
      redirect: (BuildContext context, GoRouterState state) {
        if (!isAuthenticated && state.matchedLocation.startsWith('/profile')) {
          return '/';
        } else {
          return null;
        }
        // print('Router: Redirecting for path: ${state.uri.path}');
      },
      errorPageBuilder: (context, state) => MaterialPage(child: ErrorPage()),
    );
    return router;
  }
}
