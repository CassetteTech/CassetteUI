import 'package:cassettefrontend/core/common_widgets/animated_primary_button.dart';
import 'package:cassettefrontend/core/common_widgets/app_scaffold.dart';
import 'package:cassettefrontend/core/common_widgets/sliver_app_bar_delegate.dart';
import 'package:cassettefrontend/core/constants/app_constants.dart';
import 'package:cassettefrontend/core/constants/image_path.dart';
import 'package:cassettefrontend/core/styles/app_styles.dart';
import 'package:cassettefrontend/core/utils/app_utils.dart';
import 'package:cassettefrontend/feature/profile/model/user_profile_models.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cassettefrontend/core/services/auth_service.dart';
import 'package:cassettefrontend/core/services/api_service.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:cassettefrontend/feature/profile/services/profile_service.dart';
import 'package:cassettefrontend/core/common_widgets/loading_widget.dart';
import 'package:cassettefrontend/core/common_widgets/error_widget.dart';
import 'package:cassettefrontend/core/env.dart';

class ProfilePage extends StatefulWidget {
  final String userIdentifier; // Can be either UUID or username ?

  const ProfilePage({Key? key, required this.userIdentifier}) : super(key: key);

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage>
    with SingleTickerProviderStateMixin {
  late ProfileService _profileService;
  final _authService = AuthService();
  late final ApiService _apiService;
  UserBio? _userBio;
  List<ActivityPost> _activityPosts = [];
  bool isMenuVisible = false;
  late TabController tabController;
  int selectedIndex = 0;
  int _currentPage = 1;
  int _totalItems = 0;
  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _error;
  String? _selectedElementType;
  bool _isCurrentUser = false;
  bool _isMounted = true; // Track mounted state
  String? _lastLoadedUserId; // Track last loaded user ID

  @override
  void initState() {
    super.initState();
    _apiService = ApiService(_authService);
    _profileService = ProfileService(_apiService);
    tabController = TabController(length: 4, vsync: this);

    // Remove the initial element type setting since we'll fetch all types
    tabController.addListener(() {
      if (!tabController.indexIsChanging &&
          tabController.index != selectedIndex) {
        String newElementType;
        switch (tabController.index) {
          case 0:
            newElementType = 'Playlist';
            break;
          case 1:
            newElementType = 'Track';
            break;
          case 2:
            newElementType = 'Artist';
            break;
          case 3:
            newElementType = 'Album';
            break;
          default:
            newElementType = 'Playlist';
        }

        _safeSetState(() {
          selectedIndex = tabController.index;
          _selectedElementType = newElementType;
        });
      }
    });

    _loadProfile();
  }

  @override
  void didUpdateWidget(ProfilePage oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Only reload if the user identifier changed
    if (oldWidget.userIdentifier != widget.userIdentifier) {
      _loadProfile();
    }
  }

  @override
  void dispose() {
    _isMounted = false;
    tabController.dispose();
    super.dispose();
  }

  void _safeSetState(VoidCallback fn) {
    if (_isMounted) {
      setState(fn);
    }
  }

  Future<void> _loadProfile() async {
    if (!_isMounted) return;

    // Check if we already loaded this user's profile
    if (_lastLoadedUserId == widget.userIdentifier && _userBio != null) {
      return;
    }

    try {
      _safeSetState(() {
        _isLoading = true;
        _error = null;
      });

      // Check if this is the current user's profile
      final currentUser = await _authService.getCurrentUser();
      if (!_isMounted) return;

      // If we're in edit mode, we need the current user's data
      final isEditMode = widget.userIdentifier == 'edit';
      final userIdToFetch = isEditMode && currentUser != null
          ? currentUser['userId']?.toString() ?? 'edit'
          : widget.userIdentifier;

      final isCurrentUser = currentUser != null &&
          (currentUser['userId'].toString() == userIdToFetch ||
              currentUser['username'].toString().toLowerCase() ==
                  userIdToFetch.toLowerCase());

      if (isEditMode && !isCurrentUser) {
        throw Exception('You must be logged in to edit your profile');
      }

      // Fetch user bio
      final userBio = await _profileService.fetchUserBio(userIdToFetch);
      if (!_isMounted) return;

      // Fetch all activity types initially
      final activityData = await _profileService.fetchUserActivity(
        userIdToFetch,
        page: 1,
        // Don't specify elementType to get all types
      );
      if (!_isMounted) return;

      _safeSetState(() {
        _userBio = userBio;
        _activityPosts = activityData.items;
        _totalItems = activityData.totalItems;
        _currentPage = activityData.page;
        _isLoading = false;
        _isCurrentUser = userBio.isOwnProfile;
        _lastLoadedUserId = userIdToFetch;
        _selectedElementType = 'Playlist'; // Set default tab after loading data
      });
    } catch (e) {
      if (!_isMounted) return;
      print('❌ Error loading profile: $e');
      _safeSetState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || _activityPosts.length >= _totalItems || !_isMounted)
      return;

    try {
      _safeSetState(() {
        _isLoadingMore = true;
      });

      final nextPage = _currentPage + 1;
      final moreActivity = await _profileService.fetchUserActivity(
        widget.userIdentifier,
        page: nextPage,
        // Don't specify elementType to get all types
      );

      if (!_isMounted) return;

      _safeSetState(() {
        _activityPosts.addAll(moreActivity.items);
        _currentPage = nextPage;
        _isLoadingMore = false;
      });
    } catch (e) {
      if (!_isMounted) return;

      _safeSetState(() {
        _error = e.toString();
        _isLoadingMore = false;
      });
    }
  }

  Future<void> _filterByElementType(String? type) async {
    if (!_isMounted) return;

    // If selecting the same filter or clearing the current filter, do nothing
    if (_selectedElementType == type ||
        (type == null && _selectedElementType == null)) {
      return;
    }

    // Just update the element type filter and rebuild the UI
    // We don't need to fetch data again since we already have all posts
    _safeSetState(() {
      _selectedElementType = type;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      onBurgerPop: () {
        setState(() {
          isMenuVisible = !isMenuVisible;
        });
      },
      isMenuVisible: isMenuVisible,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildProfileContent(),
    );
  }

  Widget _buildProfileContent() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 400;
    final isLargeScreen = screenWidth > 800;
    final profileHeaderHeight =
        isSmallScreen ? 220.0 : (isLargeScreen ? 280.0 : 250.0);

    return NestedScrollView(
      headerSliverBuilder: (context, innerBoxScrolled) {
        return [
          SliverAppBar(
            backgroundColor: AppColors.textPrimary,
            elevation: 0,
            shadowColor: Colors.transparent,
            shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(bottom: Radius.zero)),
            pinned: false,
            automaticallyImplyLeading: false,
            title: _buildToolbar(),
            toolbarHeight: isSmallScreen ? 45 : 50,
          ),
          SliverPersistentHeader(
            pinned: false,
            delegate: _ProfileHeaderDelegate(
              height: profileHeaderHeight,
              child: Container(
                color: AppColors.textPrimary,
                child: Padding(
                  padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
                  child: _buildProfileDetails(),
                ),
              ),
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: SliverAppBarDelegate(
              minHeight: isSmallScreen ? 45 : 50,
              maxHeight: isSmallScreen ? 45 : 50,
              child: Material(
                elevation: 0,
                shadowColor: Colors.transparent,
                color: AppColors.textPrimary,
                child: _buildTabBar(),
              ),
            ),
          ),
        ];
      },
      body: TabBarView(
        physics: const NeverScrollableScrollPhysics(),
        controller: tabController,
        children: [
          _buildContentList(elementType: 'Playlist'), // Playlists
          _buildContentList(elementType: 'Track'), // Songs
          _buildContentList(elementType: 'Artist'), // Artists
          _buildContentList(elementType: 'Album'), // Albums
        ],
      ),
    );
  }

  Widget _buildToolbar() {
    final screenWidth = MediaQuery.of(context).size.width;
    final logoMaxWidth = screenWidth < 600 ? screenWidth * 0.3 : 180.0;

    return Stack(
      alignment: Alignment.center,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Padding(
            padding: const EdgeInsets.only(top: 10),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: logoMaxWidth,
                maxHeight: 40,
              ),
              child: Image.asset(appLogo, fit: BoxFit.contain),
            ),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: Padding(
            padding: const EdgeInsets.only(top: 0),
            child: AppUtils.burgerMenu(
              onPressed: () {
                setState(() {
                  isMenuVisible = !isMenuVisible;
                });
              },
              iconColor: AppColors.colorWhite,
              size: screenWidth < 400 ? 36.0 : 40.0,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileDetails() {
    if (_userBio == null) return const SizedBox();

    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 400;
    final isLargeScreen = screenWidth > 800;
    final avatarRadius = isSmallScreen ? 30.0 : (isLargeScreen ? 40.0 : 34.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(height: isSmallScreen ? 4 : 8),
        Row(
          children: [
            Hero(
              tag: 'profile-avatar',
              child: CircleAvatar(
                radius: avatarRadius,
                backgroundImage: _userBio!.avatarUrl != null
                    ? NetworkImage(_userBio!.avatarUrl!)
                    : null,
                backgroundColor: Colors.transparent,
              ),
            ),
            SizedBox(width: isSmallScreen ? 8 : 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _userBio!.username,
                          style: AppStyles.profileNameTs.copyWith(
                            fontSize:
                                isSmallScreen ? 18 : (isLargeScreen ? 24 : 20),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (_isCurrentUser)
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => context.go("/profile/edit"),
                            borderRadius: BorderRadius.circular(20),
                            child: Padding(
                              padding: const EdgeInsets.all(8.0),
                              child: Image.asset(icEdit,
                                  height: isSmallScreen ? 20 : 24),
                            ),
                          ),
                        ),
                    ],
                  ),
                  Text(
                    '@${_userBio!.username}',
                    style: AppStyles.profileUserNameTs.copyWith(
                      fontSize: isSmallScreen ? 14 : 16,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        SizedBox(height: isSmallScreen ? 8 : 12),
        Text(
          _userBio!.bio ?? '',
          style: AppStyles.profileBioTs.copyWith(
            fontSize: isSmallScreen ? 13 : 14,
          ),
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
        ),
        SizedBox(height: isSmallScreen ? 12 : 16),
        Row(
          children: [
            SizedBox(
              width: isSmallScreen ? 100 : (isLargeScreen ? 140 : 120),
              child: _buildServiceIcons(),
            ),
          ],
        ),
        SizedBox(height: isSmallScreen ? 12 : 16),
        _buildActionButtons(),
      ],
    );
  }

  Widget _buildServiceIcons() {
    if (_userBio == null) return const SizedBox();

    return ScrollConfiguration(
      behavior: const ScrollBehavior().copyWith(
        physics: const ClampingScrollPhysics(),
        overscroll: false,
        dragDevices: {
          PointerDeviceKind.touch,
          PointerDeviceKind.mouse,
        },
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const AlwaysScrollableScrollPhysics(
          parent: PageScrollPhysics(),
        ),
        child: Row(
          children: _userBio!.connectedServices
              .map((service) => Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _getServiceIcon(service.serviceType),
                  ))
              .toList(),
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 400;
    final isLargeScreen = screenWidth > 800;
    final buttonWidth = isLargeScreen
        ? (screenWidth * 0.15)
        : ((screenWidth - (isSmallScreen ? 30 : 40)) / 2.1);
    final buttonHeight = isSmallScreen ? 32.0 : (isLargeScreen ? 40.0 : 36.0);
    final fontSize = isSmallScreen ? 12.0 : (isLargeScreen ? 15.0 : 14.0);

    // Conditionally show the Add Music button only for the current user's profile
    final showAddMusicButton = _userBio?.isOwnProfile ?? false;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        AnimatedPrimaryButton(
          centerWidget: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset(icShare,
                  fit: BoxFit.contain, height: isSmallScreen ? 16 : 18),
              const SizedBox(width: 12),
              Text(
                "Share Profile",
                style: AppStyles.profileShareTs.copyWith(fontSize: fontSize),
              ),
            ],
          ),
          width: buttonWidth,
          height: buttonHeight,
          onTap: () => AppUtils.onShare(context, _userBio?.username ?? ''),
          radius: 12,
        ),
        if (showAddMusicButton)
          AnimatedPrimaryButton(
            topBorderWidth: 2,
            colorTop: AppColors.appBg,
            colorBottom: AppColors.appBg,
            borderColorTop: AppColors.textPrimary,
            borderColorBottom: AppColors.textPrimary,
            centerWidget: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(icMusic,
                    fit: BoxFit.contain, height: isSmallScreen ? 16 : 18),
                const SizedBox(width: 12),
                Text(
                  "Add Music",
                  style:
                      AppStyles.profileAddMusicTs.copyWith(fontSize: fontSize),
                ),
              ],
            ),
            width: buttonWidth,
            height: buttonHeight,
            onTap: () => Future.delayed(
              const Duration(milliseconds: 180),
              () => context.go("/add_music"),
            ),
            radius: 10,
          ),
      ],
    );
  }

  Widget _buildTabBar() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 400;

    return TabBar(
      controller: tabController,
      padding: EdgeInsets.zero,
      labelPadding: EdgeInsets.zero,
      indicatorPadding: EdgeInsets.zero,
      indicatorColor: AppColors.colorWhite,
      dividerColor: Colors.transparent,
      indicatorSize: TabBarIndicatorSize.label,
      labelStyle: AppStyles.profileTabSelectedTs.copyWith(
        fontSize: isSmallScreen ? 12 : 14,
      ),
      unselectedLabelStyle: AppStyles.profileTabTs.copyWith(
        fontSize: isSmallScreen ? 12 : 14,
      ),
      dividerHeight: 0,
      tabs: const [
        Tab(child: Text("Playlists")),
        Tab(child: Text("Songs")),
        Tab(child: Text("Artists")),
        Tab(child: Text("Albums")),
      ],
    );
  }

  Widget _buildContentList({String? elementType}) {
    // Show loading indicator only if the entire profile is loading
    // (handled by the build method's conditional)

    // Filter posts by element type if specified
    final filteredPosts = elementType != null
        ? _activityPosts
            .where((post) =>
                post.elementType.toLowerCase() == elementType.toLowerCase())
            .toList()
        : _activityPosts;

    if (filteredPosts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.music_note,
                size: 50, color: AppColors.textPrimary.withOpacity(0.5)),
            const SizedBox(height: 16),
            Text(
              "No ${elementType?.toLowerCase() ?? 'items'} to display",
              style: AppStyles.itemTitleTs.copyWith(
                color: AppColors.textPrimary.withOpacity(0.5),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: filteredPosts.length,
      shrinkWrap: true,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(top: 5),
      itemBuilder: (context, index) {
        return _buildActivityPostItem(filteredPosts[index]);
      },
    );
  }

  Widget _buildActivityPostItem(ActivityPost post) {
    // Add this print statement for debugging
    print('DEBUG: Activity Post - ID: ${post.postId}, Title: ${post.title}');

    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 400;
    final isLargeScreen = screenWidth > 800;
    final imageHeight = isSmallScreen ? 100.0 : (isLargeScreen ? 150.0 : 130.0);
    final imageWidth = isSmallScreen ? 95.0 : (isLargeScreen ? 145.0 : 125.0);
    final horizontalPadding =
        isSmallScreen ? 6.0 : (isLargeScreen ? 16.0 : 12.0);

    return InkWell(
      onTap: () {
        // Navigate based on element type
        switch (post.elementType.toLowerCase()) {
          case 'track':
            context.go('/track/${post.postId}');
            break;
          case 'artist':
            context.go('/artist/${post.postId}');
            break;
          case 'album':
            context.go('/album/${post.postId}');
            break;
          case 'playlist':
            context.go('/playlist/${post.postId}');
            break;
          default:
            print('Unknown element type: ${post.elementType}');
            break;
        }
      },
      child: Container(
        margin: EdgeInsets.symmetric(
            vertical: 4,
            horizontal: isSmallScreen ? 4 : (isLargeScreen ? 16 : 8)),
        padding: EdgeInsets.all(horizontalPadding),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
              color: AppColors.textPrimary.withOpacity(0.1), width: 0.5),
          gradient: LinearGradient(
              colors: [AppColors.colorWhite.withOpacity(0.51), AppColors.appBg],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter),
          boxShadow: [
            BoxShadow(
              color: AppColors.textPrimary.withOpacity(0.05),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: post.imageUrl != null
                  ? Image.network(
                      post.imageUrl!,
                      height: imageHeight,
                      width: imageWidth,
                      fit: BoxFit.cover,
                    )
                  : Container(
                      height: imageHeight,
                      width: imageWidth,
                      color: AppColors.textPrimary.withOpacity(0.1),
                      child: Icon(Icons.music_note,
                          color: AppColors.textPrimary.withOpacity(0.5)),
                    ),
            ),
            SizedBox(width: isSmallScreen ? 8 : 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.red.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(
                                  color: Colors.red.withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    _getTypeIcon(post.elementType),
                                    size: 12,
                                    color: Colors.red,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    post.elementType.toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.red,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              post.title,
                              style: AppStyles.itemTitleTs.copyWith(
                                fontSize: isSmallScreen
                                    ? 14
                                    : (isLargeScreen ? 18 : 16),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      AnimatedPrimaryButton(
                        centerWidget: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.asset(
                              icShare,
                              fit: BoxFit.contain,
                              height: isSmallScreen ? 12 : 15,
                            ),
                          ],
                        ),
                        colorBottom: AppColors.animatedBtnColorConvertBottom,
                        borderColorTop: AppColors.textPrimary,
                        colorTop: AppColors.textPrimary,
                        borderColorBottom: AppColors.textPrimary,
                        initialPos: 3,
                        width: isSmallScreen ? 40 : 50,
                        height: isSmallScreen ? 24 : 28,
                        onTap: () {
                          // Share the post URL
                          final baseUrl = Uri.base.toString().isNotEmpty
                              ? Uri.base.origin
                              : Env.appDomain;
                          final shareUrl =
                              '$baseUrl/${post.elementType.toLowerCase()}/${post.postId}';
                          AppUtils.onShare(context, shareUrl);
                        },
                        radius: 12,
                      ),
                    ],
                  ),
                  SizedBox(height: isSmallScreen ? 6 : 8),
                  Text(
                    post.subtitle ?? '',
                    style: AppStyles.itemDesTs.copyWith(
                      fontSize: isSmallScreen ? 12 : (isLargeScreen ? 14 : 13),
                      color: AppColors.textPrimary.withOpacity(0.7),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: isSmallScreen ? 8 : 10),
                  _buildRichText(
                    "from: ${post.username}",
                    leadingText: "from: ",
                    style: AppStyles.itemFromTs.copyWith(
                      fontSize: isSmallScreen ? 11 : 12,
                    ),
                    style2: AppStyles.itemUsernameTs.copyWith(
                      fontSize: isSmallScreen ? 11 : 12,
                    ),
                  ),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildRichText(String text,
      {String? leadingText, TextStyle? style, TextStyle? style2}) {
    if (leadingText != null) {
      return RichText(
        text: TextSpan(
          text: leadingText,
          style: style ?? AppStyles.itemRichTextTs,
          children: <TextSpan>[
            TextSpan(
              text: text.substring(leadingText.length),
              style: style2 ?? AppStyles.itemRichText2Ts,
            ),
          ],
        ),
      );
    } else {
      return Text(
        text,
        style: style2 ?? AppStyles.itemRichText2Ts,
      );
    }
  }

  Widget _getServiceIcon(String serviceName) {
    switch (serviceName) {
      case "spotify":
        return _serviceIcon(
          icSpotify,
          AppColors.greenAppColor,
        );
      case "apple":
        return _serviceIcon(
          icApple,
          AppColors.animatedBtnColorToolBarTop,
        );
      case "youtube":
        return _serviceIcon(
          icYtMusic,
          AppColors.animatedBtnColorToolBarTop,
        );
      case "tidal":
        return _serviceIcon(
          icTidal,
          AppColors.textPrimary,
        );
      case "deezer":
        return _serviceIcon(
          icDeezer,
          AppColors.textPrimary,
        );
      default:
        return _serviceIcon(
          icSpotify,
          AppColors.greenAppColor,
        );
    }
  }

  Widget _serviceIcon(String image, Color color) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 400;
    final isLargeScreen = screenWidth > 800;
    final iconSize = isSmallScreen ? 20.0 : (isLargeScreen ? 28.0 : 24.0);

    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.appBg.withOpacity(0.1),
      ),
      padding: EdgeInsets.all(isSmallScreen ? 3 : 4),
      child: Image.asset(
        image,
        height: iconSize,
        fit: BoxFit.contain,
        color: color,
      ),
    );
  }

  IconData _getTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case "track":
        return Icons.music_note;
      case "playlist":
        return Icons.playlist_play;
      case "artist":
        return Icons.person;
      case "album":
        return Icons.album;
      default:
        return Icons.help;
    }
  }
}

// Profile header delegate for sliver persistent header
class _ProfileHeaderDelegate extends SliverPersistentHeaderDelegate {
  final double height;
  final Widget child;

  _ProfileHeaderDelegate({required this.height, required this.child});

  @override
  double get minExtent => height;

  @override
  double get maxExtent => height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return child;
  }

  @override
  bool shouldRebuild(covariant _ProfileHeaderDelegate oldDelegate) {
    return oldDelegate.height != height || oldDelegate.child != child;
  }
}
