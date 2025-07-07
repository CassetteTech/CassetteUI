import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../env.dart';
import 'auth_service.dart';
import 'api_service.dart';
import 'package:logging/logging.dart';

class SpotifyService {
  static final _logger = Logger('SpotifyService');
  static String get _clientId => Env.spotifyClientId;

  final AuthService _authService;

  SpotifyService(this._authService);

  Future<void> initiateSpotifyAuthFlow(String frontendReturnUrl) async {
    _logger.info(
        'Initiating Spotify auth flow. Frontend return URL: $frontendReturnUrl');

    try {
      // Ensure we're authenticated before starting
      final currentUser = await _authService.getCurrentUser();
      if (currentUser == null) {
        throw 'User must be authenticated to connect Spotify';
      }

      // Use the current URL as the return URL to preserve auth state
      final currentUrl = Uri.base.toString();
      _logger.info('Using current URL as return URL: $currentUrl');

      final Uri initEndpoint =
          Uri.parse('${ApiService.baseUrl}/api/v1/music-services/spotify/init');
      final headers = await _authService.authHeaders
        ..addAll({'Content-Type': 'application/json'});

      final response = await http.post(
        initEndpoint,
        headers: headers,
        body: json.encode({'returnUrl': currentUrl}),
      );

      _logger.fine(
          'Backend /spotify/init response status: ${response.statusCode}');
      _logger.fine('Backend /spotify/init response body: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        if (responseData['success'] == true &&
            responseData['authUrl'] != null) {
          final String authUrl = responseData['authUrl'];
          _logger.info('Received Spotify auth URL from backend: $authUrl');

          final Uri launchUri = Uri.parse(authUrl);
          if (await canLaunchUrl(launchUri)) {
            await launchUrl(launchUri,
                webOnlyWindowName: '_self'
                // mode: kIsWeb
                //     ? LaunchMode.platformDefault
                //     : LaunchMode.externalApplication
                    );
            _logger.info('Launched Spotify auth URL.');
          } else {
            _logger.severe('Could not launch Spotify URL: $authUrl');
            throw 'Could not launch Spotify authorization URL.';
          }
        } else {
          final String errorMessage = responseData['message'] ?? 'Unknown error connecting to Spotify';
          _logger.warning('Backend returned error: $errorMessage');
          throw errorMessage;
        }
      } else {
        _logger.warning(
            'Backend /spotify/init failed with status: ${response.statusCode}. Body: ${response.body}');
        throw 'Failed to initiate Spotify connection (Status: ${response.statusCode}). Check backend logs.';
      }
    } catch (e) {
      _logger.severe('Error initiating Spotify auth flow: $e');
      throw 'An error occurred while connecting to Spotify: $e';
    }
  }

  Future<bool> isSpotifyConnected() async {
    try {
      final Uri connectedEndpoint =
          Uri.parse('${ApiService.baseUrl}/api/v1/music-services/connected');
      final headers = await _authService.authHeaders;

      final response = await http.get(
        connectedEndpoint,
        headers: headers,
      );

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        if (responseData['success'] == true) {
          final List<dynamic> services = responseData['services'];
          return services.contains('spotify');
        }
      }
      return false;
    } catch (e) {
      _logger.warning('Error checking if Spotify is connected: $e');
      return false;
    }
  }

  Future<bool> disconnectSpotify() async {
    try {
      final Uri disconnectEndpoint =
          Uri.parse('${ApiService.baseUrl}/api/v1/music-services/spotify');
      final headers = await _authService.authHeaders;

      final response = await http.delete(
        disconnectEndpoint,
        headers: headers,
      );

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        return responseData['success'] == true;
      }
      return false;
    } catch (e) {
      _logger.warning('Error disconnecting Spotify: $e');
      return false;
    }
  }
}
