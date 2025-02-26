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
            return SpotifyCallbackPage(code: code, error: error);
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
              return EntityPage(
                type: 'track',
                trackId: postData['musicElementId'] as String?,
                postId: id,
                postData: postData,
              );
            }

            // Fallback if no postData
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

            return EntityPage(
              type: 'artist',
              trackId: postData?['musicElementId'] as String?,
              postId: id,
              postData: postData,
            );
          },
        ),
        GoRoute(
          name: 'album',
          path: '/album/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'];
            final postData = state.extra as Map<String, dynamic>?;
            return CollectionPage(
              type: 'album',
              trackId: id,
              postData: postData,
            );
          },
        ),
        GoRoute(
          name: 'playlist',
          path: '/playlist/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'];
            final postData = state.extra as Map<String, dynamic>?;
            return CollectionPage(
              type: 'playlist',
              trackId: id,
              postData: postData,
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
          path: '/p/:postId',
          builder: (context, state) {
            final postId = state.pathParameters['postId'];
            final postData = state.extra as Map<String, dynamic>?;
            return PostPage(postData: postData ?? {'postId': postId});
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
