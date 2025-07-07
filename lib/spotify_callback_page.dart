import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cassettefrontend/core/services/spotify_service.dart';
import 'package:cassettefrontend/core/services/auth_service.dart';
import 'package:cassettefrontend/core/services/api_service.dart';
import 'package:logging/logging.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class SpotifyCallbackPage extends StatefulWidget {
  final String? code;
  final String? error;

  const SpotifyCallbackPage({super.key, this.code, this.error});

  @override
  _SpotifyCallbackPageState createState() => _SpotifyCallbackPageState();
}

class _SpotifyCallbackPageState extends State<SpotifyCallbackPage> {
  final _logger = Logger('SpotifyCallbackPage');
  final _authService = AuthService();
  late final ApiService _apiService;

  @override
  void initState() {
    super.initState();
    _logger.info('SpotifyCallbackPage: initState called');
    _apiService = ApiService(_authService);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handleCallback();
    });
  }

  void _handleCallback() async {
    _logger.info('SpotifyCallbackPage: _handleCallback called');

    final uri = Uri.base;
    final code = uri.queryParameters['code'];
    final state = uri.queryParameters['state'];
    final error = uri.queryParameters['error'];

    _logger.info('Spotify Callback URL: $uri');
    _logger.info('Query Parameters: ${uri.queryParameters}');
    _logger.info('Spotify Callback Code: $code');
    _logger.info('Spotify Callback State: $state');
    _logger.info('Spotify Callback Error: $error');

    try {
      if (code != null && state != null) {
        final currentUser = await _authService.getCurrentUser();
        if (currentUser == null) {
          _logger.warning('User not authenticated during callback');
          if (mounted) context.go('/signin');
          return;
        }

        _logger.info('Exchanging Spotify code for token...');
        final headers = await _authService.authHeaders
          ..addAll({'Content-Type': 'application/json'});
        final response = await http.post(
          Uri.parse('${ApiService.baseUrl}/api/v1/music-services/spotify/exchange-code'),
          headers: headers,
          body: json.encode({'code': code, 'state': state}),
        );

        if (response.statusCode == 200) {
          final responseBody = jsonDecode(response.body);
          final returnUrl = responseBody['returnUrl'];
          _logger.info(
              'Successfully exchanged code for token. Navigating to: $returnUrl');

          if (mounted) {
            // The returnUrl from the backend is a full URL, so we parse the path from it for go_router.
            final returnUri = Uri.parse(returnUrl);
            context.go(returnUri.path);
          }
        } else {
          _logger.warning(
              'Failed to exchange code for token. Status: ${response.statusCode}, Body: ${response.body}');
          if (mounted) context.go('/profile'); // Navigate to a fallback page
        }
      } else if (error != null) {
        _logger.warning('Spotify authentication error: $error');
        if (mounted) context.go('/profile'); // Navigate to a fallback page
      } else {
        _logger
            .warning('Spotify callback is missing code or state parameters.');
        if (mounted) context.go('/profile'); // Navigate to a fallback page
      }
    } catch (e) {
      _logger.severe('Error handling Spotify callback: $e');
      if (mounted) {
        context.go('/profile'); // Navigate to a fallback/error page
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
