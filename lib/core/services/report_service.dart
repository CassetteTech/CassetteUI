import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/app_config.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ReportService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // Create a consistent post URL
  String _generatePostUrl(String elementType, String postId) {
    // Remove 'p_' prefix if it exists to avoid duplication
    final cleanPostId = postId.startsWith('p_') ? postId : 'p_$postId';
    return 'http://cassette.tech/${elementType.toLowerCase()}/$cleanPostId';
  }

  // Create a service role client for operations that need to bypass RLS
  // Note: You'll need to add your service role key to your app's configuration
  // This is typically stored in a secure environment variable or config file
  SupabaseClient get _adminClient {
    // For development purposes only - in production, use secure methods to store keys
    const serviceRoleKey =
        String.fromEnvironment('SUPABASE_SERVICE_ROLE_KEY', defaultValue: '');
    const supabaseUrl =
        String.fromEnvironment('SUPABASE_URL', defaultValue: '');

    if (serviceRoleKey.isNotEmpty && supabaseUrl.isNotEmpty) {
      return SupabaseClient(
        supabaseUrl,
        serviceRoleKey,
      );
    }
    // Fallback to regular client if service role key is not available
    return _supabase;
  }

  /// Send a webhook notification to Discord
  Future<void> _sendWebhookNotification({
    required String postId,
    required String issueType,
    required String elementType,
    required String elementId,
    String? description,
    String? originalLink,
    Map<String, dynamic>? apiResponse,
    String? postUrl,
  }) async {
    try {
      // Ensure dotenv is initialized
      if (!dotenv.isInitialized) {
        print(
            'Environment variables not initialized, attempting to initialize...');
        await AppConfig.initialize();
      }

      final webhookUrl = AppConfig.reportWebhookUrl;
      if (webhookUrl.isEmpty) {
        print(
            'Webhook URL not configured in environment variables or .env file');
        return;
      }

      // Get the current user for additional context
      final userId = _supabase.auth.currentUser?.id;

      // Create an embedded message for Discord
      final embed = {
        'title': '🚨 New Report Submitted',
        'color': 0xFF0000, // Red color for reports
        'fields': <Map<String, dynamic>>[
          {'name': '📝 Issue Type', 'value': issueType, 'inline': true},
          {'name': '🎵 Element Type', 'value': elementType, 'inline': true},
          {'name': '🔍 Element ID', 'value': elementId, 'inline': true},
          {
            'name': '🔗 Post URL',
            'value': postUrl ?? _generatePostUrl(elementType, postId),
            'inline': true
          },
          if (userId != null)
            {'name': '👤 Reporter ID', 'value': userId, 'inline': true},
          if (description != null && description.isNotEmpty)
            {'name': '📄 Description', 'value': description, 'inline': false},
          if (originalLink != null && originalLink.isNotEmpty)
            {
              'name': '🔗 Original Link',
              'value': originalLink,
              'inline': false
            },
        ],
        'timestamp': DateTime.now().toIso8601String(),
        'footer': {
          'text': 'Cassette Report System',
        }
      };

      final Map<String, dynamic> payload = {
        'username': 'Cassette Report Bot',
        'avatar_url':
            'https://github.com/matttoppi/cassette/blob/main/lib/assets/images/cassette_words_logo.png?raw=true',
        'embeds': [embed],
      };

      // Format the API response for display if present
      if (apiResponse != null) {
        try {
          // Extract relevant fields from API response
          final relevantInfo = <String, dynamic>{};

          // Check status and errors at different levels
          if (apiResponse['success'] != null)
            relevantInfo['success'] = apiResponse['success'];
          if (apiResponse['status'] != null)
            relevantInfo['status'] = apiResponse['status'];
          if (apiResponse['errorMessage'] != null)
            relevantInfo['errorMessage'] = apiResponse['errorMessage'];
          if (apiResponse['error'] != null)
            relevantInfo['error'] = apiResponse['error'];

          // Add element type if present
          if (apiResponse['elementType'] != null) {
            relevantInfo['elementType'] = apiResponse['elementType'];
          }

          // Add details if they exist, filtering out null values
          if (apiResponse['details'] != null) {
            final details = <String, dynamic>{};
            final detailsData = apiResponse['details'] as Map<String, dynamic>;

            detailsData.forEach((key, value) {
              if (value != null) {
                // Only add non-null values
                details[key] = value;
              }
            });

            if (details.isNotEmpty) {
              // Only add if we have non-null details
              relevantInfo['details'] = details;
            }
          }

          // Extract platform-specific links and details
          if (apiResponse['platforms'] != null) {
            final platformLinks = <String, Map<String, dynamic>>{};

            (apiResponse['platforms'] as Map<String, dynamic>)
                .forEach((platform, data) {
              final platformData = <String, dynamic>{};

              // Only include non-null values
              void addIfNotNull(String key) {
                if (data[key] != null) {
                  platformData[key] = data[key];
                }
              }

              // Check essential fields
              addIfNotNull('url');
              addIfNotNull('name');
              addIfNotNull('artistName');
              addIfNotNull('albumName');
              addIfNotNull('isrc');

              // Check for errors
              addIfNotNull('errorMessage');
              addIfNotNull('error');
              addIfNotNull('status');

              if (platformData.isNotEmpty) {
                platformLinks[platform] = platformData;
              }
            });

            if (platformLinks.isNotEmpty) {
              relevantInfo['platform_details'] = platformLinks;
            }
          }

          // Format the relevant information
          final relevantInfoFormatted =
              const JsonEncoder.withIndent('  ').convert(relevantInfo);

          final fields = embed['fields'] as List<Map<String, dynamic>>;

          // Check if the formatted response is too long for a single field
          if (relevantInfoFormatted.length > 1000) {
            // Split into multiple fields if needed
            final parts = relevantInfoFormatted.split('\n');
            var currentPart = '';
            var partNumber = 1;

            for (final line in parts) {
              if ((currentPart + line + '\n').length > 900) {
                fields.add({
                  'name':
                      '⚠️ Simplified API Response Details (Part $partNumber)',
                  'value': '```json\n$currentPart\n```',
                  'inline': false
                });
                currentPart = line;
                partNumber++;
              } else {
                currentPart += line + '\n';
              }
            }

            if (currentPart.isNotEmpty) {
              fields.add({
                'name': '⚠️ Simplified API Response Details (Part $partNumber)',
                'value': '```json\n$currentPart\n```',
                'inline': false
              });
            }
          } else {
            fields.add({
              'name': '⚠️ Simplified API Response Details',
              'value': '```json\n$relevantInfoFormatted\n```',
              'inline': false
            });
          }

          // If there are validation errors, add them separately
          if (apiResponse.containsKey('validationErrors')) {
            final validationErrors = apiResponse['validationErrors'];
            if (validationErrors != null) {
              fields.add({
                'name': '❌ Validation Errors',
                'value':
                    '```json\n${const JsonEncoder.withIndent('  ').convert(validationErrors)}\n```',
                'inline': false
              });
            }
          }
        } catch (e) {
          print('Error formatting API response: $e');
          final fields = embed['fields'] as List<Map<String, dynamic>>;
          fields.add({
            'name': '⚠️ API Response (Error)',
            'value': 'Failed to format API response: ${e.toString()}',
            'inline': false
          });
        }
      }

      final response = await http.post(
        Uri.parse(webhookUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode != 204) {
        print('Failed to send webhook notification: ${response.body}');
      } else {
        print('Webhook notification sent successfully');
      }
    } catch (e) {
      print('Error sending webhook notification: $e');
      if (e is Error) {
        print('Stack trace: ${e.stackTrace}');
      }
      // Don't rethrow - we don't want webhook failures to break the main flow
    }
  }

  /// Submit a report for a post
  Future<void> submitReport({
    required String postId,
    required String issueType,
    required String elementType,
    required String elementId,
    String? description,
    String? originalLink,
    Map<String, dynamic>? apiResponse,
    String? postUrl,
  }) async {
    try {
      print('Submitting report with data:');
      print('Post ID: $postId');
      print('Post URL: $postUrl');
      print('Issue Type: $issueType');
      print('Element Type: $elementType');
      print('Element ID: $elementId');
      print('Description: $description');
      print('Original Link: $originalLink');
      print('API Response: $apiResponse');

      // Get current user ID if authenticated
      final userId = _supabase.auth.currentUser?.id;

      final reportData = {
        'post_id': postId,
        'issue_type': issueType.toLowerCase().replaceAll(' ', '_'),
        'description': description,
        'element_type': elementType.toLowerCase(),
        'element_id': elementId,
        'status': 'pending',
        if (userId != null) 'user_id': userId,
        if (originalLink != null) 'original_link': originalLink,
        if (apiResponse != null) 'api_response': apiResponse,
        if (postUrl != null) 'post_url': postUrl,
      };

      print('Formatted report data: $reportData');

      // Submit the report to the database
      await _supabase.from('post_reports').insert(reportData);

      // Send webhook notification with all available information
      await _sendWebhookNotification(
        postId: postId,
        issueType: issueType,
        elementType: elementType,
        elementId: elementId,
        description: description,
        originalLink: originalLink,
        apiResponse: apiResponse,
        postUrl: postUrl,
      );

      print('Report submitted successfully');
    } catch (e, stackTrace) {
      print('Error submitting report: $e');
      print('Stack trace: $stackTrace');
      if (e is PostgrestException) {
        print('Postgrest error code: ${e.code}');
        print('Postgrest error message: ${e.message}');
        print('Postgrest error details: ${e.details}');
      }
      rethrow;
    }
  }

  /// Get reports for a specific post
  Future<List<Map<String, dynamic>>> getReportsForPost(String postId) async {
    try {
      final response = await _supabase
          .from('post_reports')
          .select()
          .eq('post_id', postId)
          .order('created_at', ascending: false);

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print('Error fetching reports: $e');
      rethrow;
    }
  }

  /// Get all reports for the current user
  Future<List<Map<String, dynamic>>> getUserReports() async {
    try {
      final response = await _supabase
          .from('post_reports')
          .select()
          .order('created_at', ascending: false);

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print('Error fetching user reports: $e');
      rethrow;
    }
  }
}
