import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:async';
import 'api_service.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService extends ChangeNotifier {
  static final AuthService _instance = AuthService._internal();
  late final ApiService _apiService;
  final _storage = const FlutterSecureStorage();
  final _authStateController = StreamController<bool>.broadcast();
  Stream<bool> get authStateChanges => _authStateController.stream;

  // Storage keys for tokens and session
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userKey = 'user_data';
  static const String _sessionExpiryKey = 'session_expiry';

  // Cache session for 5 minutes
  static const sessionCacheDuration = Duration(minutes: 5);

  // In-memory cache
  Map<String, dynamic>? _cachedUser;
  DateTime? _sessionExpiryTime;
  String? _cachedToken;
  bool _isCheckingAuth = false;
  DateTime? _lastAuthCheck;
  bool _isInitialized = false;
  bool _isCriticalOperation =
      false; // Flag for operations that shouldn't be throttled
  static const authCheckThrottle =
      Duration(seconds: 10); // Reduced throttle time

  // Get auth headers for API requests
  Future<Map<String, String>> get authHeaders async {
    final token = await getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  factory AuthService() {
    return _instance;
  }

  AuthService._internal() {
    // Don't automatically initialize to prevent race conditions
  }

  // Initialize auth state listener
  void initAuthStateListener() {
    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    if (_isInitialized) return;
    _isInitialized = true;

    try {
      await _loadCachedSession();
      await _checkAuthState();

      // Set up periodic session check every 15 minutes instead of 4
      Timer.periodic(const Duration(minutes: 15), (_) {
        _checkAuthState();
      });
    } catch (e) {
      print('❌ [Auth] Error during initialization: $e');
      _isInitialized = false;
    }
  }

  void initializeApiService(ApiService apiService) {
    _apiService = apiService;
  }

  // Load cached session data on startup
  Future<void> _loadCachedSession() async {
    try {
      final expiryStr = await _storage.read(key: _sessionExpiryKey);
      final userData = await _storage.read(key: _userKey);
      final token = await _storage.read(key: _accessTokenKey);

      if (expiryStr != null && userData != null) {
        final expiry = DateTime.parse(expiryStr);
        if (expiry.isAfter(DateTime.now())) {
          _cachedUser = json.decode(userData);
          _sessionExpiryTime = expiry;
          _cachedToken = token;
          _authStateController.add(true);
          notifyListeners();
        } else {
          // Clear expired session
          await _clearSessionData();
        }
      }
    } catch (e) {
      print('Error loading cached session: $e');
      await _clearSessionData();
    }
  }

  // Save session data with expiration
  Future<void> _saveSessionData(Map<String, dynamic> userData) async {
    print('📝 [Auth] Saving session data: $userData');

    // Normalize the user data to ensure consistent field names
    final normalizedData = {
      ...userData,
      'userId': userData['userId'] ?? userData['UserId'] ?? userData['id'],
      'authUserId': userData['authUserId'] ?? userData['AuthUserId'],
      'username': userData['username'] ?? userData['Username'],
      'email': userData['email'] ?? userData['Email'],
      'bio': userData['bio'] ?? userData['Bio'],
      'avatarUrl': userData['avatarUrl'] ?? userData['AvatarUrl'],
    };

    print('✅ [Auth] Normalized session data: $normalizedData');

    _cachedUser = normalizedData;
    _sessionExpiryTime = DateTime.now().add(sessionCacheDuration);

    await _storage.write(key: _userKey, value: json.encode(normalizedData));
    await _storage.write(
      key: _sessionExpiryKey,
      value: _sessionExpiryTime!.toIso8601String(),
    );
  }

  // Mark the start of a critical operation
  void beginCriticalOperation() {
    _isCriticalOperation = true;
  }

  // Mark the end of a critical operation
  void endCriticalOperation() {
    _isCriticalOperation = false;
  }

  // Check if auth check should be throttled
  bool _shouldThrottleAuthCheck() {
    // Never throttle during critical operations
    if (_isCriticalOperation) return false;

    if (_lastAuthCheck == null) return false;
    return DateTime.now().difference(_lastAuthCheck!) < authCheckThrottle;
  }

  // Check auth state on initialization
  Future<void> _checkAuthState() async {
    if (_isCheckingAuth) return;
    _isCheckingAuth = true;

    try {
      final user = await getCurrentUser(forceRefresh: true);
      final isAuth = user != null;
      print('🔐 [Auth] Auth state check - authenticated: $isAuth');
      _authStateController.add(isAuth);
      notifyListeners();
    } catch (e) {
      print('❌ [Auth] Error checking auth state: $e');
      // Don't immediately invalidate the session on refresh failure
      // Only invalidate if we can't get the current user
      final currentUser = await getCurrentUser(forceRefresh: false);
      if (currentUser == null) {
        _authStateController.add(false);
        notifyListeners();
      }
    } finally {
      _isCheckingAuth = false;
    }
  }

  // Get current user data with improved caching
  Future<Map<String, dynamic>?> getCurrentUser(
      {bool forceRefresh = false}) async {
    try {
      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && _isSessionValid()) {
        print('📝 [Auth] Returning cached user data: $_cachedUser');
        return _cachedUser;
      }

      // Prevent concurrent auth checks
      if (_isCheckingAuth && !forceRefresh && !_isCriticalOperation) {
        print('⚠️ [Auth] Auth check already in progress');
        return _cachedUser;
      }

      // Throttle auth checks except during critical operations
      if (!forceRefresh &&
          !_isCriticalOperation &&
          _shouldThrottleAuthCheck()) {
        print('⚠️ [Auth] Auth check throttled, using cached data');
        return _cachedUser;
      }

      _isCheckingAuth = true;
      _lastAuthCheck = DateTime.now();

      final token = await getAuthToken();
      if (token == null) {
        print('❌ [Auth] No auth token available');
        await _clearSessionData();
        _isCheckingAuth = false;
        return null;
      }

      print('🔄 [Auth] Fetching fresh session data');
      final response = await http.get(
        Uri.parse('${ApiService.apiUrl}/auth/session'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        // Decode and explicitly cast the response body
        final dynamic decodedBody = json.decode(response.body);
        if (decodedBody is! Map<String, dynamic>) {
          throw Exception('Invalid response format from server');
        }
        final Map<String, dynamic> data = decodedBody;

        if (data['success'] == true && data['user'] != null) {
          await _saveSessionData(data['user'] as Map<String, dynamic>);
          _isCheckingAuth = false;
          return _cachedUser;
        }
      } else if (response.statusCode == 401) {
        // Token might be expired, try to refresh
        final refreshed = await _refreshToken();
        _isCheckingAuth = false;
        if (refreshed) {
          return getCurrentUser(forceRefresh: true);
        }
      }

      _isCheckingAuth = false;
      await _clearSessionData();
      return null;
    } catch (e) {
      print('❌ [Auth] Error getting current user: $e');
      _isCheckingAuth = false;
      await _clearSessionData();
      return null;
    }
  }

  // Check if session cache is valid
  bool _isSessionValid() {
    final isValid = _cachedUser != null &&
        _sessionExpiryTime != null &&
        _cachedToken != null &&
        _sessionExpiryTime!.isAfter(DateTime.now());

    if (!isValid && _cachedUser != null) {
      // Clear invalid session immediately
      _clearSessionData();
    }

    return isValid;
  }

  // Get the current auth token with improved validation
  Future<String?> getAuthToken() async {
    try {
      // Return cached token if available and session is valid
      if (_cachedToken != null && _isSessionValid()) {
        return _cachedToken;
      }

      final token = await _storage.read(key: _accessTokenKey);
      if (token == null) {
        print('❌ [Auth] No token in storage');
        await _clearSessionData();
        return null;
      }
      _cachedToken = token;
      return token;
    } catch (e) {
      print('❌ [Auth] Error getting auth token: $e');
      await _clearSessionData();
      return null;
    }
  }

  // Sign up with email and password
  Future<Map<String, dynamic>> signUp({
    required String email,
    required String password,
    required String username,
  }) async {
    print(
        '📝 [Auth] Starting sign up process for email: ${email.split('@')[0]}***');
    try {
      final response = await http.post(
        Uri.parse('${ApiService.apiUrl}/auth/signup'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
          'username': username,
        }),
      );

      final data = json.decode(response.body);
      print('🔄 [Auth] Sign up response status: ${response.statusCode}');

      if (response.statusCode == 200 && data['success'] == true) {
        print('✅ [Auth] Sign up successful');
        // Normalize and store user data
        final userData = data['user'];
        final normalizedData = <String, dynamic>{
          ...userData,
          'userId': userData['id'] ?? userData['userId'],
          'authUserId': userData['authUserId'],
        };

        print('💾 [Auth] Saving auth data to storage');
        await _storage.write(key: _accessTokenKey, value: data['token']);
        await _storage.write(
            key: _refreshTokenKey, value: data['refreshToken']);
        
        // Update the session cache immediately
        _cachedToken = data['token'];
        await _saveSessionData(normalizedData);

        print('📢 [Auth] Notifying listeners of auth state change');
        _authStateController.add(true);
        notifyListeners();
        
        // Longer delay to ensure all listeners are notified and UI updates
        await Future.delayed(const Duration(milliseconds: 300));
        
        return data;
      } else {
        print('❌ [Auth] Sign up failed: ${data['message']}');
        throw Exception(data['message'] ?? 'Failed to sign up');
      }
    } catch (e) {
      print('❌ [Auth] Sign up error: $e');
      rethrow;
    }
  }

  // Sign in with email and password
  Future<Map<String, dynamic>> signIn({
    required String email,
    required String password,
  }) async {
    beginCriticalOperation();
    try {
      final response = await http.post(
        Uri.parse('${ApiService.apiUrl}/auth/signin'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );

      // Decode and explicitly cast the response body
      final dynamic decodedBody = json.decode(response.body);
      if (decodedBody is! Map<String, dynamic>) {
        throw Exception('Invalid response format from server');
      }
      final Map<String, dynamic> data = decodedBody;

      if (response.statusCode == 200 && data['success'] == true) {
        // Explicitly cast user data
        final dynamic userPayload = data['user'];
        if (userPayload is! Map<String, dynamic>) {
          throw Exception('Invalid user data format in response');
        }
        final Map<String, dynamic> userData = userPayload;
        
        // Normalize user data (already typed correctly now)
        final normalizedData = {

          ...userData,
          'userId': userData['id'] ?? userData['userId'],
          'authUserId': userData['authUserId'],
        };

        // Update persistent storage for tokens first
        await _storage.write(key: _accessTokenKey, value: data['token'] as String?);
        await _storage.write(key: _refreshTokenKey, value: data['refreshToken'] as String?);
        _cachedToken = data['token'] as String?;

        await _saveSessionData(normalizedData);

        _authStateController.add(true);
        notifyListeners();
        return data;
      } else {
        throw Exception(data['message'] ?? 'Failed to sign in');
      }
    } catch (e) {
      print('❌ [Auth] Sign in error: $e');
      rethrow;
    } finally {
      endCriticalOperation();
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      await Supabase.instance.client.auth.signOut();
      await _clearSessionData();
      _authStateController.add(false);
      notifyListeners();
    } catch (e) {
      print('Error signing out: $e');
      rethrow;
    }
  }

  // Check if user is authenticated
  Future<bool> isAuthenticated() async {
    print('🔍 [Auth] Checking authentication status');
    print('🔍 [Auth] Session valid: ${_isSessionValid()}');
    print('🔍 [Auth] Cached user: ${_cachedUser != null}');
    print('🔍 [Auth] Cached token: ${_cachedToken != null}');
    
    if (_isSessionValid()) {
      print('✅ [Auth] Session is valid');
      return true;
    }

    final user = await getCurrentUser();
    final isAuth = user != null;
    print('🔐 [Auth] Authentication check result: $isAuth');
    if (isAuth && user != null) {
      print('👤 [Auth] User authenticated with ID: ${user['userId'] ?? user['id']}');
    }
    _authStateController.add(isAuth);
    return isAuth;
  }

  // Refresh token
  Future<bool> _refreshToken() async {
    try {
      print('🔄 [Auth] Refreshing token !!!');
      final refreshToken = await _storage.read(key: _refreshTokenKey);
      if (refreshToken == null) return false;

      final response = await http.post(
        Uri.parse('${ApiService.apiUrl}/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'token': refreshToken}),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        await _storage.write(key: _accessTokenKey, value: data['token']);
        await _storage.write(
            key: _refreshTokenKey, value: data['refreshToken']);
        if (data['user'] != null) {
          await _storage.write(key: _userKey, value: json.encode(data['user']));
        }
        return true;
      }
      return false;
    } catch (e) {
      print('❌ [Auth] Token refresh error: $e');
      return false;
    }
  }

  // Sign in with OAuth provider
  Future<Map<String, dynamic>> signInWithOAuth({
    required String provider,
    required String redirectUrl,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiService.apiUrl}/auth/oauth/$provider'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'redirectUrl': redirectUrl,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data;
        } else {
          throw Exception(
              data['message'] ?? 'Failed to sign in with $provider');
        }
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to sign in with $provider');
      }
    } catch (e) {
      print('❌ [Auth] OAuth sign in error: $e');
      rethrow;
    }
  }

  // Dispose method to clean up stream controller
  void dispose() {
    _authStateController.close();
  }

  // Clear session data
  Future<void> _clearSessionData() async {
    _cachedUser = null;
    _sessionExpiryTime = null;
    _cachedToken = null;
    await _storage.delete(key: _userKey);
    await _storage.delete(key: _sessionExpiryKey);
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
    _authStateController.add(false);
    notifyListeners();
  }

  // Store OAuth state for verification
  Future<void> storeAuthState(String provider, String state) async {
    try {
      await _storage.write(key: '${provider}_auth_state', value: state);
    } catch (e) {
      print('❌ [Auth] Error storing auth state: $e');
      throw 'Failed to store auth state: $e';
    }
  }

  // Get stored OAuth state
  Future<String?> getAuthState(String provider) async {
    try {
      return await _storage.read(key: '${provider}_auth_state');
    } catch (e) {
      print('❌ [Auth] Error getting auth state: $e');
      return null;
    }
  }

  // Clear stored OAuth state
  Future<void> clearAuthState(String provider) async {
    try {
      await _storage.delete(key: '${provider}_auth_state');
    } catch (e) {
      print('❌ [Auth] Error clearing auth state: $e');
    }
  }
}
