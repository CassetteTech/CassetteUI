import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../env.dart';
import 'dart:math';

class SpotifyService {
  static String get _clientId => Env.spotifyClientId;
  static String get _clientSecret => Env.spotifyClientSecret;
  static String get _localRedirectUri => '${Env.appDomain}/spotify_callback';
  static String get _productionRedirectUri =>
      '${Env.appDomain}/spotify_callback';
  static const String _scope = 'user-read-private user-read-email';
  static const _secureStorage = FlutterSecureStorage();

  static String _generateState() {
    final random = Random.secure();
    final values = List<int>.generate(32, (i) => random.nextInt(256));
    return base64Url.encode(values);
  }

  static String get _redirectUri {
    if (kIsWeb) {
      final currentUrl = Uri.base.toString();
      print('Current URL: $currentUrl');
      if (currentUrl.startsWith('http://localhost') ||
          currentUrl.startsWith('http://127.0.0.1')) {
        return _localRedirectUri;
      } else {
        return _productionRedirectUri;
      }
    } else {
      return _localRedirectUri;
    }
  }

  static Future<void> initiateSpotifyAuth(BuildContext context) async {
    final state = _generateState();
    
    // Store the state in secure storage
    await _secureStorage.write(key: 'spotify_auth_state', value: state);
    print('Stored Spotify auth state: $state');
    
    final String redirectUri = _redirectUri;
    final String encodedRedirectUri = Uri.encodeComponent(redirectUri);
    final String authUrl = 'https://accounts.spotify.com/authorize'
        '?client_id=$_clientId'
        '&response_type=code'
        '&redirect_uri=$encodedRedirectUri'
        '&scope=$_scope'
        '&state=$state';

    print('Full Spotify auth URL: $authUrl');
    print('Redirect URI (not encoded): $redirectUri');
    print('Redirect URI (encoded): $encodedRedirectUri');

    if (kIsWeb) {
      // For web, open in the same tab
      await launchUrl(Uri.parse(authUrl), webOnlyWindowName: '_self');
    } else {
      // For mobile platforms
      if (await canLaunchUrl(Uri.parse(authUrl))) {
        await launchUrl(Uri.parse(authUrl),
            mode: LaunchMode.externalApplication);
      } else {
        throw 'Could not launch $authUrl';
      }
    }
  }

  static Future<bool> exchangeCodeForToken(String code) async {
    try {
      print('Exchanging code for token...');
      final response = await http.post(
        Uri.parse('https://accounts.spotify.com/api/token'),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization':
              'Basic ${base64Encode(utf8.encode('$_clientId:$_clientSecret'))}',
        },
        body: {
          'grant_type': 'authorization_code',
          'code': code,
          'redirect_uri': _redirectUri,
        },
      );

      print('Response status code: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final refreshToken = data['refresh_token'];
        final accessToken = data['access_token'];
        final expiresIn = data['expires_in'] as int;
        
        // Store tokens in secure storage
        await _secureStorage.write(key: 'spotify_access_token', value: accessToken);
        await _secureStorage.write(key: 'spotify_refresh_token', value: refreshToken);
        await _secureStorage.write(
          key: 'spotify_token_expiry',
          value: DateTime.now().add(Duration(seconds: expiresIn)).toIso8601String()
        );
        
        print('✅ Successfully stored Spotify tokens in secure storage');
        
        // Keep the original database update code, but commented out for future reference
        final user = Supabase.instance.client.auth.currentUser;
        if (user != null) {
          try {
            await Supabase.instance.client.from('user_profiles').upsert({
              'id': user.id,
              'spotify_refresh_token': refreshToken,
              'updated_at': DateTime.now().toIso8601String(),
            });
            return true; // Return true if successful
          } catch (e) {
            print('Error updating user profile: $e');
            return false; // Return false if there's an error updating the profile
          }
        } else {
          print('No current user found');
          return false; // Return false if there's no current user
        }
      } else {
        print('Failed to exchange code for token: ${response.body}');
        return false; // Return false if the API call was not successful
      }
    } catch (e) {
      print('Error in exchangeCodeForToken: $e');
      return false; // Return false if there's an exception
    }
  }
  
  // Get the Spotify access token from secure storage
  static Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: 'spotify_access_token');
  }
  
  // Get the Spotify refresh token from secure storage
  static Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: 'spotify_refresh_token');
  }
}
