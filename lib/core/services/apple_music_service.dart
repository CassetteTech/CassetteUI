import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:js_interop';
import 'dart:async';
import '../env.dart';
import 'auth_service.dart';
import 'api_service.dart';
import 'package:logging/logging.dart';

@JS('jsConfigureMusicKit')
external JSPromise configureMusicKitJS(String token);

@JS('jsAuthorizeUser')
external JSPromise authorizeUserJS();

class AppleMusicService {
  static final _logger = Logger('AppleMusicService');
  final AuthService _authService;

  AppleMusicService(this._authService);

  Future<void> initializeAppleMusic() async {
    try {
      _logger.info('Initializing Apple Music authentication');

      // Get the current user
      final currentUser = await _authService.getCurrentUser();
      if (currentUser == null) {
        throw 'User must be authenticated to connect Apple Music';
      }

      // Get developer token from backend
      final Uri developerTokenEndpoint = Uri.parse(
          '${ApiService.baseUrl}/api/v1/music-services/apple-music/developer-token');
      final headers = await _authService.authHeaders;

      final response = await http.get(
        developerTokenEndpoint,
        headers: headers,
      );

      if (response.statusCode != 200) {
        throw 'Failed to get Apple Music developer token';
      }

      final responseData = json.decode(response.body);
      if (!responseData['success'] || responseData['developerToken'] == null) {
        throw 'Invalid developer token response';
      }

      final String developerToken = responseData['developerToken'];
      _logger.info('Developer token: $developerToken');

      // Configure MusicKit
      final configured = await configureMusicKitJS(developerToken).toDart;
      if (!(configured as bool)) {
        throw 'Failed to configure MusicKit';
      }

      // Get user authorization
      final result = await authorizeUserJS().toDart;
      if (result == null) {
        throw 'User declined Apple Music authorization';
      }

            // Convert the JavaScript result to a Dart Map
      final dartifiedResult = (result as JSAny).dartify();
      Map<String, dynamic> authResult;

      if (dartifiedResult is Map) {
        try {
          authResult = Map<String, dynamic>.from(dartifiedResult);
        } catch (conversionError) {
          _logger.severe('Failed to convert Apple Music authorization result to Map<String, dynamic>: $conversionError. Original data: $dartifiedResult');
          throw 'Invalid Apple Music authorization data format.';
        }
      } else {
        _logger.severe('Apple Music authorization result was not a Map. Received: ${dartifiedResult.runtimeType}, Value: $dartifiedResult');
        throw 'Unexpected Apple Music authorization data format.';
      }
      
      // Check if the token exists in the converted map
      if (authResult['token'] == null) {
          _logger.severe('Apple Music authorization token not found in the result. AuthResult: $authResult');
          throw 'Apple Music authorization token not found.';
      }

      
      // Store the token in backend
      final Uri userTokenEndpoint = Uri.parse(
          '${ApiService.baseUrl}/api/v1/music-services/apple-music/user-token');
      
      final tokenResponse = await http.post(
        userTokenEndpoint,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: json.encode({'musicUserToken': authResult['token']}),
      );

      if (tokenResponse.statusCode != 200) {
        throw 'Failed to store Apple Music user token';
      }

      _logger.info('Apple Music authentication completed successfully');
    } catch (e) {
      _logger.severe('Error during Apple Music authentication: $e');
      throw 'Failed to connect Apple Music: $e';
    }
  }
} 