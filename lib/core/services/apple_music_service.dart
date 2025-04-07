import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../env.dart';
import 'dart:html' as html;
import 'dart:js' as js;
import 'dart:async';
import 'dart:math';
import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import 'dart:html';
import 'dart:js_util';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AppleMusicService {
  static const String _userTokenKey = 'apple_music_user_token';
  final _secureStorage = const FlutterSecureStorage();
  
  bool _isInitialized = false;
  StreamController<String>? _messageController;

  /// Generate a developer token for Apple Music API
  Future<String> _generateDeveloperToken() async {
    try {
      final teamId = Env.appleMusicTeamId;
      final keyId = Env.appleMusicKeyId;
      String privateKey = Env.appleMusicPrivateKey;

      if (teamId.isEmpty || keyId.isEmpty || privateKey.isEmpty) {
        throw Exception('Apple Music credentials not properly configured');
      }

      // Clean up the private key
      privateKey = privateKey.replaceAll('\\n', '\n').trim();

      final claims = {
        'iss': teamId,
        'iat': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'exp': DateTime.now()
                .add(const Duration(days: 180))
                .millisecondsSinceEpoch ~/
            1000,
      };

      final jwt = JWT(
        claims,
        header: {'alg': 'ES256', 'kid': keyId, 'typ': 'JWT'},
      );

      return jwt.sign(
        ECPrivateKey(privateKey),
        algorithm: JWTAlgorithm.ES256,
      );
    } catch (e) {
      print('Error generating Apple Music developer token: $e');
      throw Exception('Failed to generate developer token');
    }
  }

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Generate the developer token
      final developerToken = await _generateDeveloperToken();
      print('Developer token generated successfully');
      
      // Configure MusicKit with developer token
      await promiseToFuture(callMethod(
        html.window,
        'configureMusicKit',
        [developerToken],
      ));
      
      _isInitialized = true;
      print('MusicKit initialized successfully');
    } catch (e) {
      print('Error initializing MusicKit: $e');
      rethrow;
    }
  }

  Future<String?> requestUserToken() async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      // Set up message listener for authorization result
      _messageController = StreamController<String>();
      
      // Create a completer to wait for the message
      final completer = Completer<String?>();
      
      // Set up a one-time listener for the message
      final subscription = html.window.onMessage.listen((event) {
        final data = event.data;
        print('Received message from JavaScript: $data');
        
        if (data is String) {
          if (data.startsWith('ERROR:')) {
            print('Error from JavaScript: ${data.substring(6)}');
            completer.complete(null);
          } else {
            print('Received token from JavaScript, length: ${data.length}');
            print('Token preview: ${data.substring(0, min(10, data.length))}...');
            completer.complete(data);
          }
        }
      });

      // Request authorization
      print('Calling requestUserToken in JavaScript');
      final result = await promiseToFuture(callMethod(
        html.window,
        'requestUserToken',
        [],
      ));
      
      print('JavaScript requestUserToken returned: $result');
      
      // Wait for the message with a timeout
      final token = await completer.future.timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          print('Timeout waiting for token from JavaScript');
          return null;
        },
      );
      
      // Clean up
      subscription.cancel();
      await _messageController?.close();
      _messageController = null;

      // Store the token securely
      if (token != null) {
        print('Storing token in secure storage, length: ${token.length}');
        try {
          await _secureStorage.write(key: _userTokenKey, value: token);
          print('Token successfully stored in secure storage');
          
          // Verify the token was stored
          final storedToken = await _secureStorage.read(key: _userTokenKey);
          if (storedToken != null) {
            print('Verified token in secure storage, length: ${storedToken.length}');
            print('Stored token preview: ${storedToken.substring(0, min(10, storedToken.length))}...');
          } else {
            print('WARNING: Token was not found in secure storage after writing');
          }
          
          return token;
        } catch (e) {
          print('Error storing token in secure storage: $e');
          // Still return the token even if storage fails
          return token;
        }
      } else {
        print('No valid token received from MusicKit');
      }

      return null;
    } catch (e) {
      print('Error requesting user token: $e');
      return null;
    } finally {
      await _messageController?.close();
      _messageController = null;
    }
  }

  Future<bool> signOut() async {
    try {
      // Clear stored token
      await _secureStorage.delete(key: _userTokenKey);
      return true;
    } catch (e) {
      print('Error signing out: $e');
      return false;
    }
  }

  Future<bool> isConnected() async {
    final token = await _secureStorage.read(key: _userTokenKey);
    return token != null;
  }

  Future<String?> getStoredToken() async {
    return await _secureStorage.read(key: _userTokenKey);
  }
}
