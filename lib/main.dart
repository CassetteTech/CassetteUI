import 'package:cassettefrontend/core/env.dart';
import 'package:cassettefrontend/core/storage/preference_helper.dart';
import 'package:flutter/material.dart';
import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_strategy/url_strategy.dart';
import 'dart:html' if (dart.library.html) 'dart:html' as html;
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'core/services/router.dart';
import 'core/services/spotify_service.dart';
import 'core/services/api_service.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
bool isAuthenticated = false;
final supabase = Supabase.instance.client;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  setPathUrlStrategy();

  try {
    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey,
      debug: true,
    );
    print('Supabase initialized successfully');

    // Initialize API service and warm up Lambdas if enabled
    final apiService = ApiService();

    // Only perform lambda warmup if enabled in config
    if (Env.enableLambdaWarmup) {
      print('Lambda warmup enabled, starting warmup...');
      apiService.warmupLambdas().then((results) {
        print('Lambda warmup results: $results');
      }).catchError((error) {
        print('Lambda warmup error: $error');
      });
    } else {
      print('Lambda warmup disabled by configuration');
    }
  } catch (e) {
    print('Initialization error: $e');
  }

  PreferenceHelper.load().then((value) {
    runApp(MyApp());
  });
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late GoRouter router;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    router = AppRouter.getRouter(false); // Initialize router first
    //_handleInitialUri();

    // Listen for auth state changes (this is for app auth, not Spotify)
    // supabase.auth.onAuthStateChange.listen(
    //   (data) {
    //     final AuthChangeEvent event = data.event;
    //     if (!mounted) return;

    //     setState(() {
    //       switch (event) {
    //         case AuthChangeEvent.initialSession:
    //           // Don't force sign out, just set the state
    //           isAuthenticated = data.session != null;
    //           router = AppRouter.getRouter(isAuthenticated);
    //           // Handle initial URI after Supabase is initialized
    //           // _handleInitialUri(); // Commented out to avoid duplicate handling
    //           break;
    //         case AuthChangeEvent.signedIn:
    //           isAuthenticated = true;
    //           router = AppRouter.getRouter(true);
    //           break;
    //         case AuthChangeEvent.signedOut:
    //           isAuthenticated = false;
    //           router = AppRouter.getRouter(false);
    //           if (_initialized) {
    //             router.go('/');
    //           }
    //           break;
    //         case AuthChangeEvent.tokenRefreshed:
    //           // Handle token refresh if needed
    //           break;
    //         default:
    //           break;
    //       }
    //       _initialized = true;
    //     });
    //   },
    // );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      title: 'Cassette App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      builder: FlutterSmartDialog.init(),
    );
  }

  void _handleInitialUri() {
    final uri = Uri.base;
    if (uri.path == '/spotify_callback') {
      // Let the router handle the callback instead of handling it here
      // final code = uri.queryParameters['code'];
      // final error = uri.queryParameters['error'];
      // final state = uri.queryParameters['state'];
      // _handleSpotifyCallback(code, error, state);
      router.go(uri.toString());
    }
  }

  // Keeping this for reference in case we need to debug the callback handling
  // void _handleSpotifyCallback(String? code, String? error, String? state) async {
  //   if (code != null) {
  //     try {
  //       await SpotifyService.exchangeCodeForToken(code);
  //       print('Successfully exchanged code for token');
  //     } catch (e) {
  //       print('Error exchanging code for token: $e');
  //     }
  //   } else if (error != null) {
  //     print('Spotify auth error: $error');
  //   }
  //   // router.go('/profile');
  // }
}
