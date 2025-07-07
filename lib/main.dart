import 'package:cassettefrontend/core/env.dart';
import 'package:cassettefrontend/core/services/auth_service.dart';
import 'package:cassettefrontend/core/storage/preference_helper.dart';
import 'package:flutter/material.dart';
import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';
import 'package:go_router/go_router.dart';
import 'package:url_strategy/url_strategy.dart';
import 'dart:html' if (dart.library.html) 'dart:html' as html;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/services/router.dart';
import 'core/services/spotify_service.dart';
import 'core/services/api_service.dart';
import 'core/config/app_config.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
bool isAuthenticated = false;
late final GoRouter router;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  setPathUrlStrategy();

  try {
    // Initialize environment variables first
    await AppConfig.initialize();

    // Initialize Supabase
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
    );

    // Initialize auth service and start listening to auth state changes
    final authService = AuthService();
    authService.initAuthStateListener();

    // Get initial auth state from the auth service's cached state
    isAuthenticated = await authService.getCurrentUser() != null;
    
    // Initialize router with initial auth state
    router = AppRouter.getRouter(isAuthenticated);

    // Listen to auth state changes after initial setup
    authService.authStateChanges.listen((authenticated) {
      print('🔄 [Main] Auth state changed to: $authenticated');
      isAuthenticated = authenticated;
      // Note: The router will handle refreshes automatically via refreshListenable
    });

    // Only perform lambda warmup if enabled in config
    if (Env.enableLambdaWarmup) {
      print('Lambda warmup enabled, starting warmup...');
      final apiService = ApiService(authService);
      authService.initializeApiService(apiService);
      apiService.warmupLambdas().then((results) {
        print('Lambda warmup results: $results');
      }).catchError((error) {
        print('Lambda warmup error: $error');
      });
    } else {
      print('Lambda warmup disabled by configuration');
    }

    // Handle initial URI for Spotify callback
    final uri = Uri.base;
    if (uri.path == '/spotify_callback') {
      final code = uri.queryParameters['code'];
      final error = uri.queryParameters['error'];
      if (code != null) {
        try {
          // await SpotifyService.exchangeCodeForToken(code);
          print('Successfully exchanged code for token');
        } catch (e) {
          print('Error exchanging code for token: $e');
        }
      } else if (error != null) {
        print('Spotify auth error: $error');
      }
    }
  } catch (e) {
    print('Initialization error: $e');
    // Initialize router with default state on error
    router = AppRouter.getRouter(false);
  }

  PreferenceHelper.load().then((value) {
    runApp(MyApp(isAuthenticated: isAuthenticated));
  });
}

class MyApp extends StatelessWidget {
  final bool isAuthenticated;

  const MyApp({super.key, required this.isAuthenticated});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      routerConfig: router,
      builder: FlutterSmartDialog.init(),
      title: 'Cassette',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
    );
  }
}
