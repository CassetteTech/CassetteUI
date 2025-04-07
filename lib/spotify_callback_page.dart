import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'core/services/spotify_service.dart';
import 'core/utils/app_utils.dart';

class SpotifyCallbackPage extends StatefulWidget {
  final String? code;
  final String? error;
  final String? state;

  const SpotifyCallbackPage({super.key, this.code, this.error, this.state});

  @override
  _SpotifyCallbackPageState createState() => _SpotifyCallbackPageState();
}

class _SpotifyCallbackPageState extends State<SpotifyCallbackPage> {
  bool _isLoading = true;
  String? _errorMessage;
  final _secureStorage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    print('SpotifyCallbackPage: initState called');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handleCallback();
    });
  }

  void _handleCallback() async {
    print('SpotifyCallbackPage: _handleCallback called');
    print('Spotify Callback Code: ${widget.code}');
    print('Spotify Callback Error: ${widget.error}');
    print('Spotify Callback State: ${widget.state}');

    final uri = Uri.base;
    print('Spotify Callback URL: $uri');
    print('Path: ${uri.path}');
    print('Query Parameters: ${uri.queryParameters}');

    // Check for error parameter first
    if (widget.error != null) {
      setState(() {
        _errorMessage = 'Spotify authentication error: ${widget.error}';
        _isLoading = false;
      });
      print('Spotify authentication error: ${widget.error}');
      _navigateToProfile();
      return;
    }

    // Validate state parameter if available
    if (widget.state != null) {
      try {
        final storedState = await _secureStorage.read(key: 'spotify_auth_state');
        print('Stored state: $storedState, Received state: ${widget.state}');
        
        if (storedState != widget.state) {
          setState(() {
            _errorMessage = 'State mismatch - possible CSRF attack';
            _isLoading = false;
          });
          print('State mismatch - possible CSRF attack');
          _navigateToProfile();
          return;
        }
        
        // Clear stored state after validation
        await _secureStorage.delete(key: 'spotify_auth_state');
      } catch (e) {
        print('Error validating state: $e');
        // Continue with auth flow even if state validation fails
      }
    }

    if (widget.code != null) {
      try {
        // Exchange code for token and store in secure storage
        bool success = await SpotifyService.exchangeCodeForToken(widget.code!);
        
        if (success) {
          print('Successfully exchanged code for token and stored in secure storage');
          
          if (mounted) {
            AppUtils.showToast(context: context, title: "Spotify connected successfully");
          }
        } else {
          setState(() {
            _errorMessage = 'Failed to connect Spotify account';
            _isLoading = false;
          });
          print('Failed to exchange code for token');
        }
      } catch (e) {
        setState(() {
          _errorMessage = 'Error connecting Spotify: $e';
          _isLoading = false;
        });
        print('Error exchanging code for token: $e');
      }
    } else {
      setState(() {
        _errorMessage = 'No authorization code received';
        _isLoading = false;
      });
    }

    // Navigate to the profile page after a short delay to allow error messages to be seen
    _navigateToProfile();
  }
  
  // Navigate to profile page
  void _navigateToProfile() {
    if (mounted) {
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          context.go('/profile');
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: _isLoading
            ? const CircularProgressIndicator()
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  const SizedBox(height: 16),
                  const Text('Redirecting to profile...'),
                ],
              ),
      ),
    );
  }
}
