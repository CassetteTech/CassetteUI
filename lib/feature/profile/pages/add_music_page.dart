import 'package:cassettefrontend/core/common_widgets/animated_primary_button.dart';
import 'package:cassettefrontend/core/common_widgets/app_scaffold.dart';
import 'package:cassettefrontend/core/common_widgets/app_toolbar.dart';
import 'package:cassettefrontend/core/common_widgets/text_field_widget.dart';
import 'package:cassettefrontend/core/common_widgets/music_search_bar.dart';
import 'package:cassettefrontend/core/constants/app_constants.dart';
import 'package:cassettefrontend/core/styles/app_styles.dart';
import 'package:cassettefrontend/core/utils/app_utils.dart';
import 'package:cassettefrontend/core/services/api_service.dart';
import 'package:cassettefrontend/core/services/music_search_service.dart';
import 'package:cassettefrontend/core/services/auth_service.dart';
import 'package:cassettefrontend/core/services/auth_required_state.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:math' show min;

// Search state enum - moved outside the class
enum SearchState { idle, searching, resultsVisible }

class AddMusicPage extends StatefulWidget {
  const AddMusicPage({super.key});

  @override
  State<AddMusicPage> createState() => _AddMusicPageState();
}

class _AddMusicPageState extends State<AddMusicPage> with AuthRequiredState {
  // UI state
  bool isMenuVisible = false;

  // Search state - simplified
  SearchState _searchState = SearchState.idle;
  bool get isSearching => _searchState == SearchState.searching;
  bool get isShowingResults => _searchState == SearchState.resultsVisible;

  // Add setter for isShowingResults to fix linter errors
  set isShowingResults(bool value) {
    setState(() {
      _searchState = value ? SearchState.resultsVisible : SearchState.idle;
    });
  }

  // Loading state
  bool isLoading = false;

  // For backward compatibility with existing code
  bool get isLoadingCharts => isLoading;
  bool get isShowingSearchResults => isShowingResults;
  set isShowingSearchResults(bool value) => isShowingResults = value;

  // Data state
  Map<String, dynamic>? searchResults;
  Map<String, dynamic>? selectedItem;
  String? pastedLinkSource;
  String errorMessage = '';
  bool _isChartLoadRequested = false;
  bool _itemSelected = false;

  // Services and controllers
  final AuthService _authService = AuthService();
  late final ApiService _apiService;
  final MusicSearchService _musicSearchService = MusicSearchService();
  final FocusNode _searchFocusNode = FocusNode();
  final FocusNode _overlaySearchFocusNode = FocusNode();
  TextEditingController linkCtr = TextEditingController();
  TextEditingController desCtr = TextEditingController();
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    _apiService = ApiService(_authService);

    // Check authentication status
    _checkAuthentication();

    // Add focus listener for search field
    _searchFocusNode.addListener(_onSearchFocusChanged);

    // Add listener for text changes
    linkCtr.addListener(_onSearchTextChanged);
  }

  @override
  void dispose() {
    // Cancel any active searches
    _musicSearchService.cancelActiveRequests();
    _searchDebounce?.cancel();

    // Remove listeners
    _searchFocusNode.removeListener(_onSearchFocusChanged);
    linkCtr.removeListener(_onSearchTextChanged);

    // Dispose controllers and focus nodes
    linkCtr.dispose();
    desCtr.dispose();
    _searchFocusNode.dispose();
    _overlaySearchFocusNode.dispose();

    super.dispose();
  }

  // Handle search focus changes
  void _onSearchFocusChanged() {
    if (_searchFocusNode.hasFocus) {
      // When search gets focus, show search UI
      _showSearchUI();
    }
  }

  // Handle search text changes
  void _onSearchTextChanged() {
    // Skip if we're not in search mode
    if (_searchState == SearchState.idle) return;

    final text = linkCtr.text;

    // Check if it's a URL
    final isUrl = _isValidMusicUrl(text);

    if (isUrl) {
      // Handle URL paste
      _handleUrlPaste(text);
    } else if (text.isNotEmpty) {
      // Debounce search queries
      _searchDebounce?.cancel();
      _searchDebounce = Timer(const Duration(milliseconds: 500), () {
        _performSearch(text);
      });
    }
  }

  // Check if text is a valid music URL
  bool _isValidMusicUrl(String text) {
    final lowerText = text.toLowerCase();
    return lowerText.contains('spotify.com') ||
        lowerText.contains('apple.com/music') ||
        lowerText.contains('music.apple.com') ||
        lowerText.contains('deezer.com');
  } // should this be handled on backend?

  // Handle URL paste
  void _handleUrlPaste(String url) {
    debugPrint('Handling URL paste: $url');

    // Determine the source
    String source = 'unknown';
    final lowerUrl = url.toLowerCase();

    if (lowerUrl.contains('spotify.com')) {
      source = 'Spotify';
    } else if (lowerUrl.contains('apple.com/music') ||
        lowerUrl.contains('music.apple.com')) {
      source = 'Music';
    } else if (lowerUrl.contains('deezer.com')) {
      source = 'Deezer';
    }

    // Update state
    setState(() {
      pastedLinkSource = source;
      selectedItem = null;
      _searchState = SearchState.idle;
      errorMessage = '';
    });
  }

  // Load top charts
  Future<void> _loadTopCharts() async {
    debugPrint('==================================================');
    debugPrint('LOADING TOP CHARTS');
    debugPrint('==================================================');

    // Debug current state before loading
    debugPrint('Current state before loading top charts:');
    debugPrint('  isShowingSearchResults: $isShowingSearchResults');
    debugPrint('  isSearching: $isSearching');
    debugPrint('  isLoadingCharts: $isLoadingCharts');
    debugPrint('  isLoading: $isLoading');

    // Skip if already loading
    if (isLoading) {
      debugPrint('Already loading top charts, skipping this request');
      return;
    }

    setState(() {
      isLoading = true;
    });
    debugPrint('Set isLoading to true');

    try {
      debugPrint('Calling API to fetch top charts');
      final results = await _musicSearchService.fetchTop50USAPlaylist();

      // Safety check in case component unmounted
      if (!mounted) {
        debugPrint('Widget not mounted, ignoring top charts results');
        return;
      }

      // Debug the structure of the results
      debugPrint('Top charts loaded, analyzing results structure:');
      debugPrint('Results type: ${results.runtimeType}');
      if (results is Map<String, dynamic>) {
        debugPrint('Results keys: ${results.keys.toList()}');

        if (results.containsKey('results')) {
          final resultsList = results['results'];
          debugPrint('Results list type: ${resultsList.runtimeType}');
          if (resultsList is List) {
            debugPrint('Number of top chart items: ${resultsList.length}');
            if (resultsList.isNotEmpty) {
              debugPrint('First item type: ${resultsList.first.runtimeType}');
              if (resultsList.first is Map<String, dynamic>) {
                debugPrint(
                    'First item keys: ${(resultsList.first as Map<String, dynamic>).keys.toList()}');
              }
            }
          }
        }
      }

      debugPrint('Updating state with top charts results');
      setState(() {
        searchResults = results;
        isLoading = false;
      });
    } catch (e) {
      debugPrint('Top charts API error: $e');
      // Safety check in case component unmounted
      if (!mounted) return;

      setState(() {
        isLoading = false;
      });

      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading top charts: ${e.toString()}'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 3),
          action: SnackBarAction(
            label: 'Retry',
            textColor: Colors.white,
            onPressed: _loadTopCharts,
          ),
        ),
      );
    }
  }

  // Method to check authentication status
  Future<void> _checkAuthentication() async {
    final isAuth = await _authService.isAuthenticated();
    if (!isAuth && mounted) {
      // If not authenticated, show message and redirect
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You must be signed in to add music to your profile'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 3),
        ),
      );
      // AuthRequiredState will handle the redirection
    }
  }

  // Handle link conversion
  Future<void> _handleLinkConversion(String link) async {
    // Check authentication first
    final isAuth = await _authService.isAuthenticated();
    if (!isAuth) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('You must be signed in to add music to your profile'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    // Get the link from selectedItem if available, otherwise use the provided link
    final String linkToConvert =
        selectedItem != null ? selectedItem!['url'] as String : link;

    if (linkToConvert.isEmpty) {
      setState(() {
        errorMessage = 'Please enter a music link or select a song';
      });
      return;
    }

    setState(() {
      isLoading = true;
      errorMessage = '';
      // Hide search results while converting
      _searchState = SearchState.idle;
    });

    try {
      // Create additional data map for optional fields
      Map<String, dynamic> additionalData = {};

      // Add description if provided
      if (desCtr.text.isNotEmpty) {
        additionalData['description'] = desCtr.text;
      }

      // Add selected item metadata if available
      if (selectedItem != null) {
        additionalData['originalItemDetails'] = {
          'title': selectedItem!['title'],
          'artist': selectedItem!['artist'],
          'type': selectedItem!['type'],
          'coverArtUrl': selectedItem!['coverArtUrl'],
        };
      }

      // Call authenticated API to add music to user profile
      final response = await _apiService.addMusicToUserProfile(linkToConvert,
          additionalData: additionalData.isNotEmpty ? additionalData : null);

      // Safety check in case component unmounted
      if (!mounted) return;

      setState(() {
        isLoading = false;
      });

      // The response has the same structure as convertMusicLink, containing elementType, postId, etc.
      // The backend should handle associating it with the user's profile based on the JWT token

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Successfully added to your profile!'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 3),
        ),
      );

      // Navigate back to profile page - this will refresh the profile content
      context.go('/profile');
    } catch (e) {
      // Safety check in case component unmounted
      if (!mounted) return;

      // Check for authentication errors specifically
      String errorMsg = e.toString();
      if (errorMsg.contains('Unauthorized') ||
          errorMsg.contains('must be logged in') ||
          errorMsg.contains('401')) {
        // Handle authentication errors
        onUnauthenticated(); // Use AuthRequiredState method to handle auth errors
        return;
      }

      setState(() {
        isLoading = false;
        errorMessage = 'Error adding music to profile: ${e.toString()}';
      });

      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
          action: SnackBarAction(
            label: 'Retry',
            textColor: Colors.white,
            onPressed: () => _handleLinkConversion(link),
          ),
        ),
      );
    }
  }

  // Handle music search
  Future<void> _handleSearch(String query) async {
    debugPrint('==================================================');
    debugPrint('HANDLING SEARCH: "$query"');
    debugPrint('==================================================');

    // Debug current state before search
    debugPrint('Current state before search:');
    debugPrint('  isShowingSearchResults: $isShowingSearchResults');
    debugPrint('  isSearching: $isSearching');
    debugPrint('  isLoadingCharts: $isLoadingCharts');
    debugPrint('  isLoading: $isLoading');

    if (query.isEmpty) {
      debugPrint('Empty query, not performing search');
      setState(() {
        searchResults = null;
        _searchState = SearchState.idle;
        // Show top charts when query is empty
        _loadTopCharts();
      });
      return;
    }

    // Skip if already searching
    if (isSearching) {
      debugPrint('Already searching, skipping this search request');
      return;
    }

    // Set loading state
    setState(() {
      _searchState = SearchState.searching;
      isLoading = true;
    });
    debugPrint('Set isSearching and isLoading to true');

    try {
      debugPrint('Calling API for search with query: "$query"');
      final results = await _musicSearchService.searchMusic(query);

      // Safety check in case component unmounted
      if (!mounted) {
        debugPrint('Widget not mounted, ignoring search results');
        return;
      }

      // Debug the structure of the results
      debugPrint('Search completed, analyzing results structure:');
      debugPrint('Results type: ${results.runtimeType}');
      if (results is Map<String, dynamic>) {
        debugPrint('Results keys: ${results.keys.toList()}');

        if (results.containsKey('results')) {
          final resultsList = results['results'];
          debugPrint('Results list type: ${resultsList.runtimeType}');
          if (resultsList is List) {
            debugPrint('Number of results: ${resultsList.length}');
            if (resultsList.isNotEmpty) {
              debugPrint('First item type: ${resultsList.first.runtimeType}');
              if (resultsList.first is Map<String, dynamic>) {
                debugPrint(
                    'First item keys: ${(resultsList.first as Map<String, dynamic>).keys.toList()}');
              }
            }
          }
        }
      }

      // Check if the query is still the same
      if (query != linkCtr.text) {
        debugPrint(
            'Query changed during search, original: "$query", current: "${linkCtr.text}"');
        setState(() {
          _searchState = SearchState.idle;
          isLoading = false;
        });
        return;
      }

      debugPrint('Updating state with search results');
      setState(() {
        searchResults = results;
        _searchState = SearchState.resultsVisible;
        isLoading = false;
      });

      // Force a rebuild to ensure overlay content updates
      if (mounted) {
        debugPrint('Forcing rebuild to update overlay content');
        setState(() {});
      }
    } catch (e) {
      debugPrint('Search API error: $e');
      // Safety check in case component unmounted
      if (!mounted) return;

      setState(() {
        _searchState = SearchState.idle;
        isLoading = false;
      });

      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error searching: ${e.toString()}'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 3),
          action: SnackBarAction(
            label: 'Retry',
            textColor: Colors.white,
            onPressed: () => _handleSearch(query),
          ),
        ),
      );
    }
  }

  // Perform search with the given query
  void _performSearch(String query) {
    debugPrint('Performing search with query: $query');

    if (query.isEmpty) {
      setState(() {
        _searchState = SearchState.idle;
      });
      return;
    }

    // Set searching state
    setState(() {
      _searchState = SearchState.searching;
      isLoading = true;
    });

    // Execute the search
    _musicSearchService.searchMusic(query).then((results) {
      if (!mounted) return;

      // Update state with results
      setState(() {
        searchResults = results;
        _searchState = SearchState.resultsVisible;
        isLoading = false;
      });
    }).catchError((error) {
      if (!mounted) return;

      debugPrint('Search error: $error');
      setState(() {
        _searchState = SearchState.idle;
        isLoading = false;
        errorMessage = 'Error searching: $error';
      });

      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error searching: $error'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 3),
        ),
      );
    });
  }

  void _showSearchUI() {
    debugPrint('_showSearchUI called - explicitly showing search results');

    // First, set the flag to show search results
    setState(() {
      _searchState = SearchState.resultsVisible;
    });

    // Explicitly unfocus the main search bar first
    _searchFocusNode.unfocus();

    // Request focus on the OVERLAY search field *after* the build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _searchState == SearchState.resultsVisible) {
        _overlaySearchFocusNode.requestFocus();
      }
    });

    // Always load top charts when showing search UI if no results are available
    if (searchResults == null && !isLoading && !_isChartLoadRequested) {
      debugPrint('Loading top charts because no search results are available');
      _loadTopCharts();
    }

    // Force a rebuild to ensure the search UI is visible
    if (mounted) {
      Future.microtask(() {
        if (mounted && _searchState != SearchState.resultsVisible) {
          setState(() {
            _searchState = SearchState.resultsVisible;
          });
        }
      });
    }
  }

  // Helper method to show top charts on the main page
  void _showTopChartsOnMainPage() {
    debugPrint('_showTopChartsOnMainPage called');
    // Only load if not already loading and no search text
    if (!isLoading && !_isChartLoadRequested && linkCtr.text.isEmpty) {
      _loadTopCharts();
    }
  }

  // Helper method to ensure search UI is shown during loading
  void _ensureSearchUIVisibleDuringLoading() {
    if (selectedItem == null && (isLoading || isSearching)) {
      debugPrint('Ensuring search UI is visible during loading');
      setState(() {
        _searchState = SearchState.resultsVisible;
      });

      // Force a rebuild after the current build cycle
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !isShowingSearchResults) {
          setState(() {
            _searchState = SearchState.resultsVisible;
          });
        }
      });
    }
  }

  // Unified handler for selecting an item from search results or top charts.
  void _handleItemSelection(Map<String, dynamic> item) {
    debugPrint('==================================================');
    debugPrint('HANDLING ITEM SELECTION');
    debugPrint('==================================================');

    // Debug current state before selection
    debugPrint('Current state before selection:');
    debugPrint('  isShowingSearchResults: $isShowingSearchResults');
    debugPrint('  isSearching: $isSearching');
    debugPrint('  isLoadingCharts: $isLoadingCharts');
    debugPrint('  isLoading: $isLoading');
    debugPrint('  _itemSelected: $_itemSelected');
    debugPrint('  selectedItem: ${selectedItem != null ? 'not null' : 'null'}');

    // Ensure we're not in search mode
    if (_searchState != SearchState.idle) {
      debugPrint('Forcing search state to idle before item selection');
      setState(() {
        _searchState = SearchState.idle;
      });
    }

    // Debug the raw item details
    try {
      debugPrint('Raw item details:');
      debugPrint('  Type: ${item.runtimeType}');
      debugPrint('  Keys: ${item.keys.join(', ')}');
      item.forEach((key, value) {
        debugPrint(
            '  $key: ${value?.toString() ?? 'null'} (${value?.runtimeType ?? 'null'})');
      });
    } catch (e) {
      debugPrint('Error debugging item: $e');
    }

    // Check for required fields
    if (!item.containsKey('title') || !item.containsKey('artist')) {
      debugPrint('WARNING: Item missing required fields (title or artist)');
    }

    // Extract item properties with null safety
    final id = item['id']?.toString() ?? '';
    debugPrint('Extracted id: $id');

    final title = item['title']?.toString() ?? 'Unknown';
    debugPrint('Extracted title: $title');

    final artist = item['artist']?.toString() ?? '';
    debugPrint('Extracted artist: $artist');

    final type = item['type']?.toString().toLowerCase() ?? 'track';
    debugPrint('Extracted type: $type');

    final url = item['url']?.toString() ?? '';
    debugPrint('Extracted url: $url');

    // Handle cover art URL extraction with fallbacks
    String coverArtUrl = '';
    if (item.containsKey('coverArtUrl') && item['coverArtUrl'] != null) {
      coverArtUrl = item['coverArtUrl'].toString();
    } else if (item.containsKey('cover_art_url') &&
        item['cover_art_url'] != null) {
      coverArtUrl = item['cover_art_url'].toString();
    } else if (item.containsKey('artwork') && item['artwork'] != null) {
      coverArtUrl = item['artwork'].toString();
    }
    debugPrint('Extracted coverArtUrl: $coverArtUrl');

    // Create a new selected item map
    final newSelectedItem = {
      'id': id,
      'title': title,
      'artist': artist,
      'type': type,
      'url': url,
      'coverArtUrl': coverArtUrl,
    };
    debugPrint('Created new selectedItem: $newSelectedItem');

    // Update the state with the selected item
    setState(() {
      selectedItem = newSelectedItem;
      _itemSelected = true;
      errorMessage = '';
      pastedLinkSource = null; // Clear any pasted link source

      // Set the search field text to the title
      if (!linkCtr.text.contains('http')) {
        linkCtr.text = title;
      }
    });

    debugPrint('Updated state: selectedItem set, _itemSelected=true');

    // Force a rebuild to ensure UI updates correctly
    if (mounted) {
      Future.microtask(() {
        setState(() {});
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('==================================================');
    debugPrint('BUILDING ADD MUSIC PAGE');
    debugPrint('==================================================');

    // Debug current state
    debugPrint('Current state during build:');
    debugPrint('  isShowingSearchResults: $isShowingSearchResults');
    debugPrint('  isSearching: $isSearching');
    debugPrint('  isLoadingCharts: $isLoadingCharts');
    debugPrint('  isLoading: $isLoading');
    debugPrint('  selectedItem: ${selectedItem != null ? 'not null' : 'null'}');
    debugPrint('  _searchState: $_searchState');

    // Debug searchResults structure if available
    if (searchResults != null) {
      debugPrint('searchResults structure:');
      debugPrint('  Type: ${searchResults.runtimeType}');

      if (searchResults is Map<String, dynamic>) {
        final map = searchResults as Map<String, dynamic>;
        debugPrint('  Keys: ${map.keys.join(', ')}');

        if (map.containsKey('results')) {
          final results = map['results'];
          if (results is List) {
            debugPrint('  Number of results: ${results.length}');
          } else {
            debugPrint('  "results" is not a List: ${results.runtimeType}');
          }
        }
      }
    } else {
      debugPrint('searchResults is null');
    }

    // Determine if search results should be shown
    // 1. Never show if an item is selected
    // 2. Show during searching, loading, or when explicitly requested
    final bool shouldShowResults =
        selectedItem == null && _searchState != SearchState.idle;

    // Ensure search results are hidden when an item is selected
    if (selectedItem != null && _searchState != SearchState.idle) {
      debugPrint(
          'Item selected but search results still showing - fixing this');
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setState(() {
            _searchState = SearchState.idle;
          });
        }
      });
    }

    debugPrint('shouldShowResults: $shouldShowResults');

    return FutureBuilder<bool>(
      future: _authService.isAuthenticated(),
      builder: (context, snapshot) {
        // Show loading indicator while checking auth
        if (snapshot.connectionState == ConnectionState.waiting) {
          return AppScaffold(
            showGraphics: true,
            body: const Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        // Get authentication status
        final bool isAuthenticated = snapshot.data ?? false;

        return AppScaffold(
          showGraphics: true,
          onBurgerPop: () {
            setState(() {
              isMenuVisible = !isMenuVisible;
            });
          },
          isMenuVisible: isMenuVisible,
          body: Stack(
            children: [
              // Main content
              Column(
                children: [
                  const SizedBox(height: 18),
                  AppToolbar(burgerMenuFnc: () {
                    setState(() {
                      isMenuVisible = !isMenuVisible;
                    });
                  }),
                  const SizedBox(height: 18),
                  profileTopView(),
                  const SizedBox(height: 38),

                  // Show authentication warning if not authenticated
                  if (!isAuthenticated)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.shade100,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade300),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.warning_amber_rounded,
                                color: Colors.red.shade700),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'You must be signed in to add music to your profile',
                                style: TextStyle(color: Colors.red.shade900),
                              ),
                            ),
                            TextButton(
                              onPressed: () => context.go('/signin'),
                              child: const Text('Sign In'),
                            ),
                          ],
                        ),
                      ),
                    ),

                  Expanded(
                    child: SingleChildScrollView(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          children: [
                            Text(
                                "Search or paste a link below to add music to your profile",
                                textAlign: TextAlign.center,
                                style: AppStyles.addMusicSubTitleTs),
                            const SizedBox(height: 24),
                            // Conditionally show search/selected item section only when overlay isn't visible
                            if (!shouldShowResults)
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text("Music link or search",
                                      textAlign: TextAlign.left,
                                      style: AppStyles
                                          .authTextFieldLabelTextStyle),
                                  const SizedBox(height: 10),
                                  // Show search bar if no item is selected (now redundant with !shouldShowResults)
                                  // Keep this structure for now, but focus is on the overlay's bar
                                  if (selectedItem == null)
                                    MusicSearchBar(
                                      hint:
                                          "Search or paste your music link here",
                                      controller: linkCtr,
                                      focusNode: _searchFocusNode,
                                      isLoading: isLoading || isSearching,
                                      onTap: () {
                                        debugPrint(
                                            'Search bar tapped on main page');
                                        _showSearchUI();
                                      },
                                      onPaste: (value) {
                                        debugPrint(
                                            'Paste detected on main page: $value');
                                        _handleUrlPaste(value);
                                      },
                                      onSearch: (query) {
                                        debugPrint(
                                            'Search triggered on main page with query: $query');
                                        // Never initiate a new search if one is already in progress
                                        if (!isLoading && !isSearching) {
                                          _performSearch(query);
                                        } else {
                                          debugPrint(
                                              'Search ignored - already in progress');
                                        }
                                      },
                                      textInputAction: TextInputAction.search,
                                      onSubmitted: (value) {
                                        debugPrint(
                                            'Search submitted on main page with value: $value');
                                        // When user hits enter/done, perform search if there's text
                                        if (value.isNotEmpty) {
                                          if (_isValidMusicUrl(value)) {
                                            _handleUrlPaste(value);
                                          } else {
                                            _performSearch(value);
                                          }
                                        }
                                      },
                                    ),

                                  // Display selected item or pasted link information
                                  _buildSelectedItemInfo(),
                                ],
                              ),

                            // Only show description field and convert button when not showing search results
                            AnimatedOpacity(
                              opacity: shouldShowResults ? 0.0 : 1.0,
                              duration: const Duration(milliseconds: 200),
                              child: IgnorePointer(
                                ignoring: shouldShowResults,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 24),
                                    Text("Description",
                                        textAlign: TextAlign.left,
                                        style: AppStyles
                                            .authTextFieldLabelTextStyle),
                                    const SizedBox(height: 10),
                                    TextFieldWidget(
                                        hint:
                                            "Let us know a little bit about this song or playlist!",
                                        maxLines: 6,
                                        minLines: 6,
                                        height: 160,
                                        height2: 156,
                                        controller: desCtr),
                                    const SizedBox(height: 32),
                                    AnimatedPrimaryButton(
                                      text: isLoading
                                          ? "Adding..."
                                          : "Add to Profile",
                                      onTap: () {
                                        // Skip the action if loading or not authenticated
                                        if (isLoading) return;
                                        if (!isAuthenticated) {
                                          ScaffoldMessenger.of(context)
                                              .showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                  'Please sign in to add music to your profile'),
                                              backgroundColor: Colors.red,
                                            ),
                                          );
                                          return;
                                        }

                                        Future.delayed(
                                          const Duration(milliseconds: 180),
                                          () {
                                            // Check if we have a selected item or a link in the text field
                                            if (selectedItem != null) {
                                              debugPrint(
                                                  'Converting selected item: ${selectedItem!['title']}');
                                              _handleLinkConversion("");
                                            } else if (linkCtr
                                                .text.isNotEmpty) {
                                              debugPrint(
                                                  'Converting link: ${linkCtr.text}');
                                              _handleLinkConversion(
                                                  linkCtr.text);
                                            } else {
                                              debugPrint(
                                                  'No item or link to convert');
                                              setState(() {
                                                errorMessage =
                                                    'Please enter a music link or search for a song';
                                              });
                                            }
                                          },
                                        );
                                      },
                                      height: 40,
                                      width: MediaQuery.of(context).size.width -
                                          46,
                                      radius: 10,
                                      initialPos: 6,
                                      topBorderWidth: 3,
                                      bottomBorderWidth: 3,
                                      colorTop:
                                          AppColors.animatedBtnColorConvertTop,
                                      textStyle:
                                          AppStyles.animatedBtnFreeAccTextStyle,
                                      borderColorTop:
                                          AppColors.animatedBtnColorConvertTop,
                                      colorBottom: AppColors
                                          .animatedBtnColorConvertBottom,
                                      borderColorBottom: AppColors
                                          .animatedBtnColorConvertBottomBorder,
                                    ),
                                    const SizedBox(height: 8),
                                    if (errorMessage.isNotEmpty)
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8),
                                        child: Text(
                                          errorMessage,
                                          style: const TextStyle(
                                            color: Colors.red,
                                            fontSize: 14,
                                          ),
                                          textAlign: TextAlign.center,
                                        ),
                                      ),
                                    const SizedBox(height: 48),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              // Search overlay - use Material for proper rendering and Positioned.fill to cover the entire screen
              if (shouldShowResults)
                Positioned.fill(
                  child: Material(
                    color: Colors.transparent,
                    elevation:
                        8, // Add elevation to ensure it appears above other content
                    child: _buildSearchOverlay(),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget profileTopView() {
    debugPrint('Building profile top view');
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 30.0,
            backgroundImage: NetworkImage(AppUtils.userProfile.avatarUrl ?? ''),
            backgroundColor: Colors.transparent,
          ),
          const SizedBox(width: 22),
          Text("Add Music", style: AppStyles.addMusicTitleTs),
        ],
      ),
    );
  }

  Widget _buildSearchOverlay() {
    debugPrint('==================================================');
    debugPrint('BUILDING SEARCH OVERLAY');
    debugPrint('==================================================');

    // Debug current state
    debugPrint('Current state in search overlay:');
    debugPrint('  isShowingSearchResults: $isShowingSearchResults');
    debugPrint('  isSearching: $isSearching');
    debugPrint('  isLoadingCharts: $isLoadingCharts');
    debugPrint('  isLoading: $isLoading');
    debugPrint('  selectedItem: ${selectedItem != null ? 'not null' : 'null'}');

    // Don't show search overlay if an item is selected and we're not loading/searching
    if (selectedItem != null) {
      debugPrint('Search overlay not shown: selectedItem is not null');
      return const SizedBox.shrink();
    }

    debugPrint('Building search overlay UI');

    // Create a background that covers the entire screen with the app's tan background color
    return AnimatedOpacity(
      opacity: 1.0,
      duration: const Duration(milliseconds: 200),
      child: Container(
        color: AppColors.appBg, // Tan background color
        child: SafeArea(
          child: Column(
            children: [
              // Search bar at the top
              Container(
                color: AppColors.textPrimary, // Dark background for search bar
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(
                            Icons.arrow_back,
                            color: Colors.white,
                          ),
                          onPressed: () {
                            debugPrint('Back button pressed in search overlay');
                            // Unfocus the overlay node *before* changing state
                            _overlaySearchFocusNode.unfocus();
                            setState(() {
                              _searchState = SearchState.idle;
                            });
                          },
                        ),
                        Text(
                          "Search Music",
                          style: AppStyles.addMusicTitleTs.copyWith(
                            color: Colors.white,
                            fontSize: 18,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Use MusicSearchBar for search and paste functionality
                    MusicSearchBar(
                      hint: "Search or paste your music link here",
                      controller: linkCtr,
                      focusNode: _overlaySearchFocusNode,
                      isLoading: isLoading || isSearching,
                      onTap: () {
                        debugPrint('Search bar tapped in overlay');
                        // No need to call _showSearchUI() here since we're already in the search UI
                      },
                      height: 50,
                      height2: 46,
                      onPaste: (value) {
                        debugPrint('Paste detected in search bar: $value');
                        _handleUrlPaste(value);
                      },
                      onSearch: (query) {
                        debugPrint('Search triggered with query: $query');
                        // Never initiate a new search if one is already in progress
                        if (!isLoading && !isSearching) {
                          _performSearch(query);
                        } else {
                          debugPrint('Search ignored - already in progress');
                        }
                      },
                      textInputAction: TextInputAction.search,
                      onSubmitted: (value) {
                        debugPrint('Search submitted with value: $value');
                        // When user hits enter/done, perform search if there's text
                        if (value.isNotEmpty) {
                          if (_isValidMusicUrl(value)) {
                            _handleUrlPaste(value);
                          } else {
                            _performSearch(value);
                          }
                        }
                      },
                    ),
                  ],
                ),
              ),

              // Search results content - takes up entire screen below search bar
              Expanded(
                child: _buildSearchResultsContent(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchResultsContent() {
    debugPrint('==================================================');
    debugPrint('BUILDING SEARCH RESULTS CONTENT');
    debugPrint('==================================================');

    // Debug current state
    debugPrint('Current state in search results content:');
    debugPrint('  isShowingSearchResults: $isShowingSearchResults');
    debugPrint('  isSearching: $isSearching');
    debugPrint('  isLoadingCharts: $isLoadingCharts');
    debugPrint('  isLoading: $isLoading');
    debugPrint('  searchResults type: ${searchResults?.runtimeType}');

    // Show loading indicator while loading or searching
    if (isLoading || isSearching) {
      debugPrint(
          'Showing loading indicator: isLoading=$isLoading, isSearching=$isSearching');
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(
                  AppColors.textPrimary, // Dark spinner on tan background
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isSearching ? 'Searching...' : 'Loading top charts...',
                style: AppStyles.itemDesTs.copyWith(
                  fontSize: 16,
                  color: AppColors.textPrimary, // Dark text on tan background
                ),
              ),
            ],
          ),
        ),
      );
    }

    // If searchResults is null, schedule loading top charts
    if (searchResults == null) {
      debugPrint('searchResults is null, scheduling chart loading');
      // Schedule the loading after the build phase
      if (!isLoading && !_isChartLoadRequested) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && !isLoading && searchResults == null) {
            debugPrint(
                'Initiating top charts loading from post-frame callback');
            _loadTopCharts();
          }
        });
      }
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(
              AppColors.textPrimary, // Dark spinner on tan background
            ),
          ),
        ),
      );
    }

    debugPrint('searchResults is not null, analyzing structure:');
    debugPrint('  searchResults type: ${searchResults.runtimeType}');
    if (searchResults is Map) {
      debugPrint(
          '  searchResults keys: ${(searchResults as Map).keys.toList()}');
    }

    // Extract results data with careful handling of different formats
    List<dynamic> results = [];

    // Try to extract results from the standard format
    if (searchResults!.containsKey('results') &&
        searchResults!['results'] is List) {
      results = searchResults!['results'] as List<dynamic>;
      debugPrint(
          'Extracted results from searchResults["results"] - count: ${results.length}');
    }
    // Fallback for direct list in searchResults
    else if (searchResults is List) {
      results = searchResults as List<dynamic>;
      debugPrint(
          'Extracted results directly from searchResults as List - count: ${results.length}');
    }
    // Fallback if searchResults itself is a single result item
    else if (searchResults is Map &&
        searchResults!.containsKey('title') &&
        searchResults!.containsKey('artist')) {
      results = [searchResults!];
      debugPrint('Created results list from single item in searchResults');
    } else {
      debugPrint(
          'WARNING: Could not extract results from searchResults: ${searchResults.runtimeType}');
      // Last resort - try to convert the entire object to a list
      try {
        final jsonStr = json.encode(searchResults);
        debugPrint(
            'Converting searchResults via JSON: ${jsonStr.substring(0, min(100, jsonStr.length))}...');

        final decoded = json.decode(jsonStr);
        if (decoded is List) {
          results = decoded;
          debugPrint(
              'Converted searchResults to List via JSON encoding/decoding - count: ${results.length}');
        } else if (decoded is Map &&
            decoded.containsKey('results') &&
            decoded['results'] is List) {
          results = decoded['results'];
          debugPrint(
              'Extracted results from JSON decoded searchResults - count: ${results.length}');
        }
      } catch (e) {
        debugPrint('Error converting searchResults: $e');
      }
    }

    debugPrint('Got ${results.length} search results');

    // Print the first result for debugging
    if (results.isNotEmpty) {
      debugPrint('First result: ${results.first}');
      if (results.first is Map) {
        final firstItem = results.first as Map;
        debugPrint('First result keys: ${firstItem.keys.toList()}');
        firstItem.forEach((key, value) {
          debugPrint(
              '  $key: ${value?.toString() ?? 'null'} (${value?.runtimeType ?? 'null'})');
        });
      }
    }

    if (results.isEmpty) {
      debugPrint('No results found');
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.search_off,
                color: AppColors.textPrimary,
                size: 48,
              ),
              const SizedBox(height: 16),
              const Text(
                'No results found',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Try a different search term',
                style: TextStyle(
                  color: AppColors.textPrimary.withOpacity(0.7),
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Header for results
    final headerText = linkCtr.text.isEmpty ? "Top Charts" : "Search Results";
    debugPrint('Rendering $headerText list with ${results.length} items');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with source info
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 2,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                headerText,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              // Music icon
              const Icon(
                Icons.music_note,
                size: 18,
                color: AppColors.textPrimary,
              ),
            ],
          ),
        ),

        // Results list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 12.0),
            itemCount: results.length,
            physics: const AlwaysScrollableScrollPhysics(),
            addAutomaticKeepAlives: false,
            addRepaintBoundaries: true,
            addSemanticIndexes: false,
            itemBuilder: (context, index) {
              final item = results[index];

              // Debug each item as we render it
              debugPrint('Rendering item $index: ${item['title']}');

              final type = item['type']?.toString().toLowerCase() ?? '';

              // Get appropriate icon based on content type
              IconData typeIcon;
              switch (type) {
                case 'track':
                  typeIcon = Icons.music_note;
                  break;
                case 'album':
                  typeIcon = Icons.album;
                  break;
                case 'artist':
                  typeIcon = Icons.person;
                  break;
                case 'playlist':
                  typeIcon = Icons.queue_music;
                  break;
                default:
                  typeIcon = Icons.music_note;
              }

              return Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    // Add extensive debugging for item selection
                    debugPrint('==========================================');
                    debugPrint('ITEM TAPPED IN SEARCH RESULTS');
                    debugPrint('Item index: $index');
                    debugPrint('Item title: ${item['title']}');
                    debugPrint('Item type: ${item['type']}');
                    debugPrint('Item artist: ${item['artist']}');
                    debugPrint('Item id: ${item['id']}');
                    debugPrint('Item url: ${item['url']}');
                    debugPrint('Item coverArtUrl: ${item['coverArtUrl']}');
                    debugPrint('Item keys: ${item.keys.toList()}');
                    debugPrint('Item raw: $item');
                    debugPrint('==========================================');

                    // First close the search UI immediately for better UX
                    setState(() {
                      _searchState = SearchState.idle;
                    });

                    // Then handle the item selection after a short delay
                    // This ensures the UI updates properly
                    Future.delayed(const Duration(milliseconds: 50), () {
                      if (mounted) {
                        _handleItemSelection(item);
                      }
                    });
                  },
                  // Add splash color for better tap feedback
                  splashColor:
                      AppColors.animatedBtnColorConvertTop.withOpacity(0.1),
                  highlightColor:
                      AppColors.animatedBtnColorConvertTop.withOpacity(0.05),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          // Cover art with nice shadow
                          Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.15),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: item['coverArtUrl'] != null
                                  ? Image.network(
                                      item['coverArtUrl'],
                                      width: 64,
                                      height: 64,
                                      fit: BoxFit.cover,
                                      errorBuilder:
                                          (context, error, stackTrace) {
                                        // Fallback if image fails to load
                                        return Container(
                                          width: 64,
                                          height: 64,
                                          color: Colors.grey[200],
                                          child: Icon(
                                            typeIcon,
                                            color: AppColors.textPrimary,
                                            size: 30,
                                          ),
                                        );
                                      },
                                    )
                                  : Container(
                                      width: 64,
                                      height: 64,
                                      color: Colors.grey[200],
                                      child: Icon(
                                        typeIcon,
                                        color: AppColors.textPrimary,
                                        size: 30,
                                      ),
                                    ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item['title'] ?? 'Unknown',
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  item['artist'] ?? '',
                                  style: TextStyle(
                                    color:
                                        AppColors.textPrimary.withOpacity(0.7),
                                    fontSize: 14,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 6),
                                // Type badge
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.animatedBtnColorConvertTop
                                        .withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(
                                      color: AppColors
                                          .animatedBtnColorConvertTop
                                          .withOpacity(0.3),
                                      width: 1,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        typeIcon,
                                        size: 12,
                                        color: AppColors.textPrimary,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        type.toUpperCase(),
                                        style: const TextStyle(
                                          color: AppColors.textPrimary,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(
                            Icons.arrow_forward_ios_rounded,
                            size: 16,
                            color: AppColors.textPrimary,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSelectedItemInfo() {
    if (selectedItem != null) {
      // Display selected item info
      final title = selectedItem!['title'] ?? 'Unknown';
      final artist = selectedItem!['artist'] ?? '';
      final type = selectedItem!['type']?.toString() ?? '';
      final source = 'Spotify'; // Always show as Spotify
      final coverArtUrl = selectedItem!['coverArtUrl'];
      final heroTag = selectedItem!['heroTag'] ?? 'selected_item';

      // Get appropriate icon based on content type
      IconData typeIcon;
      switch (type.toLowerCase()) {
        case 'track':
          typeIcon = Icons.music_note;
          break;
        case 'album':
          typeIcon = Icons.album;
          break;
        case 'artist':
          typeIcon = Icons.person;
          break;
        case 'playlist':
          typeIcon = Icons.queue_music;
          break;
        default:
          typeIcon = Icons.music_note;
      }

      return Container(
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.textPrimary.withOpacity(0.1),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Cover art
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.15),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: coverArtUrl != null
                    ? Image.network(
                        coverArtUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          // Fallback if image fails to load
                          return Container(
                            color: Colors.grey[200],
                            child: Icon(
                              typeIcon,
                              color: AppColors.textPrimary,
                              size: 24,
                            ),
                          );
                        },
                      )
                    : Container(
                        color: Colors.grey[200],
                        child: Icon(
                          typeIcon,
                          color: AppColors.textPrimary,
                          size: 24,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            // Item details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (artist.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        artist,
                        style: TextStyle(
                          color: AppColors.textPrimary.withOpacity(0.7),
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  const SizedBox(height: 6),
                  // Type and source badges
                  Row(
                    children: [
                      // Type badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.animatedBtnColorConvertTop
                              .withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: AppColors.animatedBtnColorConvertTop
                                .withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              typeIcon,
                              size: 10,
                              color: AppColors.textPrimary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              type.toUpperCase(),
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Clear button
            IconButton(
              icon: const Icon(
                Icons.close,
                size: 18,
                color: AppColors.textPrimary,
              ),
              onPressed: () {
                setState(() {
                  selectedItem = null;
                  linkCtr.clear();
                  errorMessage = '';
                });
              },
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
      );
    } else if (pastedLinkSource != null && linkCtr.text.isNotEmpty) {
      // Display pasted link info
      final displaySource =
          pastedLinkSource == 'Music' ? 'Spotify' : pastedLinkSource;

      return Container(
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.textPrimary.withOpacity(0.1),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Platform icon
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: displaySource == 'Spotify'
                    ? Colors.green.withOpacity(0.1)
                    : Colors.black.withOpacity(0.05),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: displaySource == 'Spotify'
                      ? Colors.green.withOpacity(0.3)
                      : Colors.black.withOpacity(0.2),
                  width: 1,
                ),
              ),
              child: Icon(
                Icons.music_note,
                color: displaySource == 'Spotify' ? Colors.green : Colors.black,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            // Link info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "$displaySource link pasted",
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    linkCtr.text,
                    style: TextStyle(
                      color: AppColors.textPrimary.withOpacity(0.6),
                      fontSize: 12,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            // Clear button
            IconButton(
              icon: const Icon(
                Icons.close,
                size: 18,
                color: AppColors.textPrimary,
              ),
              onPressed: () {
                setState(() {
                  pastedLinkSource = null;
                  linkCtr.clear();
                  errorMessage = '';
                });
              },
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
      );
    }

    // Return empty container if no item is selected and no link is pasted
    return const SizedBox.shrink();
  }

  String _constructUrl(String source, String type, String id, String title) {
    if (source == 'apple_music') {
      if (type == 'artist') {
        final urlSafeName = title
            .toLowerCase()
            .replaceAll(' ', '-')
            .replaceAll(RegExp(r'[^\w-]'), '');
        return 'https://music.apple.com/us/artist/$urlSafeName/$id';
      }
      return 'https://music.apple.com/us/album/$id';
    }
    return 'https://music.apple.com/search?term=${Uri.encodeComponent(title)}';
  }
}
