import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../env.dart';
import 'dart:html' as html;
import 'dart:js' as js;
import 'dart:async';
import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import 'database_service.dart';

class AppleMusicService {
  static Future<String> _generateDeveloperToken() async {
    try {
      final teamId = Env.appleMusicTeamId;
      final keyId = Env.appleMusicKeyId;
      String privateKey = Env.appleMusicPrivateKey;

      if (teamId.isEmpty || keyId.isEmpty || privateKey.isEmpty) {
        throw Exception('Apple Music credentials not properly configured');
      }

      // Clean up the private key
      privateKey = privateKey
          .replaceAll('\\n', '\n')
          .trim();

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

  static Future<void> initializeMusicKit() async {
    if (!kIsWeb) return;

    try {
      final developerToken = await _generateDeveloperToken();
      
      await js.context.callMethod('MusicKit.configure', [
        js.JsObject.jsify({
          'developerToken': developerToken,
          'app': {
            'name': 'CassetteUI',
            'build': '1.0.0',
            'version': '1.0.0',
            'debug': false,
          },
          'persistState': true,
        })
      ]);
    } catch (e) {
      print('Error initializing MusicKit: $e');
      throw Exception('Failed to initialize MusicKit');
    }
  }

  static Future<void> requestUserToken(BuildContext context) async {
    if (!kIsWeb) {
      throw Exception('Apple Music authentication is only supported on web');
    }

    try {
      // Call the existing requestUserToken function from index.html
      js.context.callMethod('requestUserToken');
      
      // Listen for the response
      final completer = Completer<String>();
      
      html.window.onMessage.listen((event) {
        final token = event.data?.toString();
        if (token != null && token.isNotEmpty) {
          completer.complete(token);
        }
      });

      final userToken = await completer.future;
      
      // Store in database using DatabaseService
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        await DatabaseService.storeAppleMusicToken(user.id, userToken);
      }
    } catch (e) {
      print('Error requesting Apple Music authorization: $e');
      throw Exception('Failed to authorize with Apple Music');
    }
  }

  static Future<void> signOut() async {
    if (!kIsWeb) return;

    try {
      js.context.callMethod('MusicKit.getInstance').callMethod('unauthorize');
      
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        await DatabaseService.updateUserProfile(
          userId: user.id,
          appleMusicToken: null,
        );
      }
    } catch (e) {
      print('Error signing out from Apple Music: $e');
    }
  }
} 