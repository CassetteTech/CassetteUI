import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:math' as math;
import 'package:cassettefrontend/core/services/auth_service.dart';

class ApiService {
  // API URLs for different environments
  static const String _prodBaseUrl =
      'https://nm2uheummh.us-east-1.awsapprunner.com';
  static const String _localBaseUrl = 'http://localhost:5173';

  final AuthService _authService;

  ApiService(this._authService);

  // Get the base URL from environment configuration
  static String get baseUrl {
    // Read the API_ENV from dart-define, default to 'prod' if not set
    const apiEnv = String.fromEnvironment('API_ENV', defaultValue: 'prod');
    print('Current API Environment: $apiEnv'); // Helpful for debugging
    return apiEnv == 'local' ? _localBaseUrl : _prodBaseUrl;
  }

  // Base domain without path for connection testing
  static String get baseDomain {
    const apiEnv = String.fromEnvironment('API_ENV', defaultValue: 'prod');
    return apiEnv == 'local' ? _localBaseUrl : _prodBaseUrl;
  }

  // Get the API URL with version
  static String get apiUrl => '$baseUrl/api/v1';

  // Normalize path to ensure it has /api/v1 prefix
  String _normalizePath(String path) {
    // Remove /api/v1 if it exists at the start
    if (path.startsWith('/api/v1')) {
      path = path.substring('/api/v1'.length);
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/$path';
    }

    return path;
  }

  // Warm up Lambda functions
  Future<Map<String, bool>> warmupLambdas() async {
    print('🔥 Starting Lambda warmup');
    try {
      final response = await http
          .get(
        Uri.parse('$apiUrl/warmup'),
        headers: getDefaultHeaders(),
      )
          .timeout(
        const Duration(seconds: 10), // 10 second timeout
        onTimeout: () {
          throw Exception('Warmup request timed out');
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ Lambda warmup completed: ${response.body}');
        return Map<String, bool>.from(data);
      } else {
        print('❌ Lambda warmup failed: ${response.statusCode}');
        throw Exception('Failed to warm up Lambdas: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Lambda warmup error: $e');
      // Return a map indicating failure for all platforms
      return {
        'spotify': false,
        'applemusic': false,
        'deezer': false,
      };
    }
  }

  // Convert a music link from one service to another
  // No authentication required for conversion
  Future<Map<String, dynamic>> convertMusicLink(String sourceLink) async {
    print('🔄 Converting music link');

    try {
      // Use default headers without authentication for public endpoint
      final response = await http.post(
        Uri.parse('$apiUrl/convert'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: json.encode({'sourceLink': sourceLink}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['success'] == true) {
          // Validate required fields
          final requiredFields = [
            'elementType',
            'musicElementId',
            'postId',
            'details'
          ];

          final missingFields = requiredFields
              .where((field) => !data.containsKey(field) || data[field] == null)
              .toList();

          if (missingFields.isNotEmpty) {
            throw Exception(
                'Missing required fields: ${missingFields.join(", ")}');
          }

          // Add the original link to the response data
          data['originalLink'] = sourceLink;
          return data;
        } else {
          final error = data['errorMessage'] ?? 'Failed to convert link';
          throw Exception(error);
        }
      } else {
        throw Exception('Failed to convert link: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [Convert] Error: $e');
      throw Exception('Failed to connect to API: $e');
    }
  }

  // Add music to the authenticated user's profile
  Future<Map<String, dynamic>> addMusicToUserProfile(String sourceLink,
      {Map<String, dynamic>? additionalData}) async {
    print('🎵 Adding music to user profile');

    try {
      // Get authenticated headers including the JWT token
      final headers = await _authService.authHeaders;

      final Map<String, dynamic> requestBody = {
        'sourceLink': sourceLink,
      };

      // Add any additional data if provided
      if (additionalData != null && additionalData.isNotEmpty) {
        requestBody.addAll(additionalData);
      }

      // Use the existing convert endpoint but include authentication headers
      final response = await http.post(
        Uri.parse('$apiUrl/convert'),
        headers: headers,
        body: json.encode(requestBody),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);

        if (data['success'] == true) {
          print('✅ Successfully added music to user profile');

          // Add the original link to the response data
          data['originalLink'] = sourceLink;

          return data;
        } else {
          final error =
              data['errorMessage'] ?? 'Failed to add music to profile';
          print('❌ API Error: $error');
          throw Exception(error);
        }
      } else if (response.statusCode == 401) {
        print('❌ Authentication error: User not authenticated');
        throw Exception('You must be logged in to add music to your profile');
      } else {
        print('❌ HTTP Error: ${response.statusCode}');
        throw Exception(
            'Failed to add music to profile: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [AddMusic] Error: $e');
      throw Exception('Failed to add music to profile: $e');
    }
  }

  Future<Map<String, dynamic>> fetchTrackData(String trackId) async {
    final response = await http.get(Uri.parse('$apiUrl/tracks/$trackId'));

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      print('Failed to load track data: ${response.statusCode}');
      throw Exception('Failed to load track data: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> fetchPostById(String postId) async {
    print('🔍 Fetching post data for postId: $postId');

    try {
      // Use the correct endpoint for fetching posts according to the API documentation
      final endpoint = '$apiUrl/social/posts/$postId';
      print('Using endpoint: $endpoint');

      final response = await http.get(
        Uri.parse(endpoint),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        // Debug the response
        print(
            '✅ Post data response: ${response.body.substring(0, math.min(500, response.body.length))}...');

        if (data['success'] == true) {
          print('✅ Successfully fetched post data for postId: $postId');
          return data;
        } else {
          final error = data['errorMessage'] ?? 'Failed to fetch post data';
          print('❌ API Error: $error');
          throw Exception(error);
        }
      } else {
        print('❌ HTTP Error: ${response.statusCode}');
        throw Exception('Failed to fetch post data: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [FetchPost] Error: $e');
      throw Exception('Failed to connect to API: $e');
    }
  }

  // Get auth headers for API requests
  Map<String, String> getDefaultHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  Future<http.Response> get(String path,
      {Map<String, String>? queryParameters}) async {
    try {
      // Get auth headers if available, otherwise use default headers
      final headers = await _authService.authHeaders;

      // Normalize the path and create full URL
      final normalizedPath = _normalizePath(path);
      final uri = Uri.parse('$apiUrl$normalizedPath')
          .replace(queryParameters: queryParameters);

      print('🔍 GET Request to: $uri'); // Debug log

      final response = await http.get(uri, headers: headers);

      // Handle common error cases
      switch (response.statusCode) {
        case 200:
          return response;
        case 401:
          throw Exception('Unauthorized: Please sign in');
        case 403:
          throw Exception('Forbidden: You do not have access to this resource');
        case 404:
          throw Exception('Resource not found');
        case >= 500:
          throw Exception('Server error: Please try again later');
        default:
          throw Exception('API Error: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ API Error: $e'); // Log error for debugging
      rethrow; // Rethrow to let caller handle specific error cases
    }
  }

  Future<http.Response> post(String path, Map<String, String> map,
      {Map<String, String>? queryParameters, Object? body}) async {
    try {
      final headers = await _authService.authHeaders;

      // Normalize the path and create full URL
      final normalizedPath = _normalizePath(path);
      final uri = Uri.parse('$apiUrl$normalizedPath')
          .replace(queryParameters: queryParameters);

      print('📮 POST Request to: $uri'); // Debug log

      final response = await http.post(
        uri,
        headers: headers,
        body: body != null ? json.encode(body) : null,
      );

      switch (response.statusCode) {
        case 200:
        case 201:
          return response;
        case 401:
          throw Exception('Unauthorized: Please sign in');
        case 403:
          throw Exception('Forbidden: You do not have access to this resource');
        case 404:
          throw Exception('Resource not found');
        case >= 500:
          throw Exception('Server error: Please try again later');
        default:
          throw Exception('API Error: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ API Error: $e');
      rethrow;
    }
  }
}
