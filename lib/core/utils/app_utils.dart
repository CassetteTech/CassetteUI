import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:cassettefrontend/core/constants/app_constants.dart';
import 'package:cassettefrontend/core/constants/image_path.dart';
import 'package:cassettefrontend/core/env.dart';
import 'package:cassettefrontend/core/styles/app_styles.dart';
import 'package:cassettefrontend/feature/profile/model/user_profile_models.dart';
import 'package:cassettefrontend/main.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:html' as html;
import 'dart:js' as js;
import 'package:url_launcher/url_launcher.dart' as url_launcher;

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:cassettefrontend/core/services/auth_service.dart';
import '../services/apple_music_service.dart';

class AppUtils {
  static UserBio userProfile = UserBio(
    userId: "1",
    username: "@MattToppi280",
    bio: "Founder of Cassette. Lead developer and music lover at heart",
    avatarUrl:
        "https://images.unsplash.com/photo-1608008961553-0c83c2883ad2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    isOwnProfile: true,
    connectedServices: [
      ConnectedService(
        serviceType: "Spotify",
        connectedAt: DateTime.now(),
      ),
      ConnectedService(
        serviceType: "Apple Music",
        connectedAt: DateTime.now(),
      ),
    ],
  );

  static final _authService = AuthService();
  static final _appleMusicService = AppleMusicService(_authService);

  static Widget burgerMenu(
      {required VoidCallback onPressed, Color? iconColor, double? size}) {
    // Get the screen width if available
    double? screenWidth;
    try {
      screenWidth = WidgetsBinding.instance.window.physicalSize.width /
          WidgetsBinding.instance.window.devicePixelRatio;
    } catch (e) {
      // If we can't get the screen width, use default sizes
    }

    // Determine icon size based on screen width
    final bool isNarrow = screenWidth != null && screenWidth < 400;
    final double iconSize = size ?? (isNarrow ? 36.0 : 42.0);
    final double imageHeight =
        size != null ? size * 0.6 : (isNarrow ? 20.0 : 24.0);

    return IconButton(
      iconSize: iconSize,
      padding: EdgeInsets.zero, // Remove padding to save space
      constraints:
          const BoxConstraints(), // Remove constraints to allow smaller size
      onPressed: onPressed,
      icon: Image.asset(
        icMenu,
        color: iconColor ?? AppColors.textPrimary,
        fit: BoxFit.contain,
        height: imageHeight,
      ),
    );
  }

  static Widget cacheImage({
    required String imageUrl,
    double? height,
    double? width,
    Widget? placeholder,
    BoxFit fit = BoxFit.cover,
    BorderRadius borderRadius = const BorderRadius.all(Radius.circular(12)),
  }) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          fit: fit,
          placeholder: (context, url) {
            return placeholder ??
                Center(
                  child: Image.asset(
                    icMusic,
                    height: 50,
                    width: 50,
                    fit: BoxFit.scaleDown,
                  ),
                );
          },
          errorWidget: (context, url, error) {
            return Center(
              child: Image.asset(
                height: 75,
                width: 75,
                icMusic,
                fit: BoxFit.scaleDown,
              ),
            );
          },
        ),
      ),
    );
  }

  static Future<void> onShare(context, content) async {
    final box = context.findRenderObject() as RenderBox?;
    await Share.share(
      content,
      sharePositionOrigin: box!.localToGlobal(Offset.zero) & box.size,
    );
  }

  static authLinksWidgets() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        GestureDetector(
            onTap: () async {
              await googleSignInSignUpFnc();
            },
            child: Image.asset(authGoogle, height: 52, fit: BoxFit.contain)),
        GestureDetector(
          onTap: () async {
            await spotifySignInSignUpFnc();
          },
          child: Image.asset(icSpotify,
              height: 52, fit: BoxFit.contain, color: AppColors.greenAppColor),
        ),
        GestureDetector(
          onTap: () async {
            await appleSignInSignUpFnc();
          },
          child: Image.asset(icApple,
              height: 52,
              fit: BoxFit.contain,
              color: AppColors.animatedBtnColorToolBarTop),
        ),
      ],
    );
  }

  static void openUrlOnNewTab(String url) {
    html.window.open(url, "new tab");
  }

  static Widget trackSocialLinksWidget({Map<String, dynamic>? platforms}) {
    // Add debugging to help diagnose issues
    print('=== Track Social Links Widget ===');
    print('Platforms data: $platforms');

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        IconButton(
          onPressed: () {
            try {
              if (platforms?.containsKey('spotify') ?? false) {
                final spotifyData =
                    platforms!['spotify'] as Map<String, dynamic>;
                print('Spotify data: $spotifyData');

                // Handle case where url is missing or empty
                String url = '';

                // Try to get URL from different possible fields
                if (spotifyData.containsKey('url') &&
                    spotifyData['url'] != null &&
                    spotifyData['url'].toString().isNotEmpty) {
                  url = spotifyData['url'].toString();
                } else if (spotifyData.containsKey('href') &&
                    spotifyData['href'] != null &&
                    spotifyData['href'].toString().isNotEmpty) {
                  url = spotifyData['href'].toString();
                } else if (spotifyData.containsKey('link') &&
                    spotifyData['link'] != null &&
                    spotifyData['link'].toString().isNotEmpty) {
                  url = spotifyData['link'].toString();
                } else if (spotifyData.containsKey('platformSpecificId') &&
                    spotifyData['platformSpecificId'] != null) {
                  // Construct Spotify URL from ID based on entity type
                  final elementType =
                      spotifyData['elementType']?.toString()?.toLowerCase() ??
                          'track';
                  url =
                      'https://open.spotify.com/$elementType/${spotifyData['platformSpecificId']}';
                }

                print('Opening Spotify URL: $url');
                if (url.isNotEmpty) {
                  openUrlOnNewTab(url);
                } else {
                  print('⚠️ No valid Spotify URL found in platform data');
                }
              }
            } catch (e) {
              print('Error opening Spotify link: $e');
            }
          },
          icon: Image.asset(icSpotify, height: 38),
        ),
        IconButton(
          onPressed: () {
            try {
              // Check for applemusic key (all lowercase, no underscore)
              if (platforms?.containsKey('applemusic') ?? false) {
                final appleData =
                    platforms!['applemusic'] as Map<String, dynamic>;
                print('Apple Music data: $appleData');

                // Handle case where url is missing or empty
                String url = '';

                // Try to get URL from different possible fields
                if (appleData.containsKey('url') &&
                    appleData['url'] != null &&
                    appleData['url'].toString().isNotEmpty) {
                  url = appleData['url'].toString();
                } else if (appleData.containsKey('href') &&
                    appleData['href'] != null &&
                    appleData['href'].toString().isNotEmpty) {
                  url = appleData['href'].toString();
                } else if (appleData.containsKey('link') &&
                    appleData['link'] != null &&
                    appleData['link'].toString().isNotEmpty) {
                  url = appleData['link'].toString();
                } else if (appleData.containsKey('platformSpecificId') &&
                    appleData['platformSpecificId'] != null) {
                  // Construct Apple Music URL based on entity type
                  final elementType =
                      appleData['elementType']?.toString()?.toLowerCase() ??
                          'track';

                  // Apple Music URLs are structured differently based on type
                  if (elementType == 'artist') {
                    url =
                        'https://music.apple.com/artist/${appleData['platformSpecificId']}';
                  } else if (elementType == 'album') {
                    url =
                        'https://music.apple.com/album/${appleData['platformSpecificId']}';
                  } else if (elementType == 'playlist') {
                    url =
                        'https://music.apple.com/playlist/${appleData['platformSpecificId']}';
                  } else {
                    // Default to track
                    url =
                        'https://music.apple.com/album/track/${appleData['platformSpecificId']}';
                  }
                }

                print('Opening Apple Music URL: $url');
                if (url.isNotEmpty) {
                  openUrlOnNewTab(url);
                } else {
                  print('⚠️ No valid Apple Music URL found in platform data');
                }
              }
              // Keep other Apple Music checks for compatibility
              else if (platforms?.containsKey('apple_music') ?? false) {
                final appleData =
                    platforms!['apple_music'] as Map<String, dynamic>;
                final url = appleData['url'] ??
                    appleData['link'] ??
                    appleData['href'] ??
                    '';
                if (url.isNotEmpty) {
                  openUrlOnNewTab(url);
                }
              } else if (platforms?.containsKey('appleMusic') ?? false) {
                final appleData =
                    platforms!['appleMusic'] as Map<String, dynamic>;
                final url = appleData['url'] ??
                    appleData['link'] ??
                    appleData['href'] ??
                    '';
                if (url.isNotEmpty) {
                  openUrlOnNewTab(url);
                }
              } else if (platforms?.containsKey('apple-music') ?? false) {
                final appleData =
                    platforms!['apple-music'] as Map<String, dynamic>;
                final url = appleData['url'] ??
                    appleData['link'] ??
                    appleData['href'] ??
                    '';
                if (url.isNotEmpty) {
                  openUrlOnNewTab(url);
                }
              }
            } catch (e) {
              print('Error opening Apple Music link: $e');
            }
          },
          icon: Image.asset(icApple, height: 38),
        ),
        IconButton(
          onPressed: () {
            try {
              if (platforms?.containsKey('deezer') ?? false) {
                final deezerData = platforms!['deezer'] as Map<String, dynamic>;
                print('Deezer data: $deezerData');

                // Handle case where url is missing or empty
                String url = '';

                // Try to get URL from different possible fields
                if (deezerData.containsKey('url') &&
                    deezerData['url'] != null &&
                    deezerData['url'].toString().isNotEmpty) {
                  url = deezerData['url'].toString();
                } else if (deezerData.containsKey('href') &&
                    deezerData['href'] != null &&
                    deezerData['href'].toString().isNotEmpty) {
                  url = deezerData['href'].toString();
                } else if (deezerData.containsKey('link') &&
                    deezerData['link'] != null &&
                    deezerData['link'].toString().isNotEmpty) {
                  url = deezerData['link'].toString();
                } else if (deezerData.containsKey('platformSpecificId') &&
                    deezerData['platformSpecificId'] != null) {
                  // Construct Deezer URL from ID based on entity type
                  final elementType =
                      deezerData['elementType']?.toString()?.toLowerCase() ??
                          'track';
                  url =
                      'https://www.deezer.com/$elementType/${deezerData['platformSpecificId']}';
                }

                print('Opening Deezer URL: $url');
                if (url.isNotEmpty) {
                  openUrlOnNewTab(url);
                } else {
                  print('⚠️ No valid Deezer URL found in platform data');
                }
              }
            } catch (e) {
              print('Error opening Deezer link: $e');
            }
          },
          icon: Image.asset(icDeezer, height: 38),
        ),
      ],
    );
  }

  static cmDesBox({String? userName, String? des}) {
    return Stack(
      children: [
        Container(
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(42),
                color: AppColors.grayColor),
            height: 175,
            margin: EdgeInsets.symmetric(horizontal: 16)),
        Container(
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(42),
              color: AppColors.colorWhite),
          height: 175,
          width: double.infinity,
          margin: EdgeInsets.only(top: 3, right: 18, left: 18),
          padding: EdgeInsets.all(12),
          child: Column(
            children: [
              Text(userName ?? '',
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppStyles.trackDetailTitleTs),
              const SizedBox(height: 12),
              Text(
                des ?? "",
                textAlign: TextAlign.left,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: AppStyles.trackDetailContentTs,
              ),
            ],
          ),
        ),
      ],
    );
  }

  static Future<XFile?> uploadPhoto() async {
    final image = await ImagePicker()
        .pickImage(source: ImageSource.gallery, maxHeight: 400, maxWidth: 400);
    return image;
  }

  static showToast({required BuildContext context, required String title}) {
    AnimatedSnackBar(
      desktopSnackBarPosition: DesktopSnackBarPosition.bottomCenter,
      mobileSnackBarPosition: MobileSnackBarPosition.bottom,
      duration: const Duration(seconds: 3),
      builder: ((context) {
        return Container(
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            color: AppColors.textPrimary,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Text(title, style: AppStyles.toastStyle),
        );
      }),
    ).show(context);
  }

  static Future<void> googleSignInSignUpFnc() async {
    try {
      // TODO: Implement OAuth with backend
      final response = await _authService.signInWithOAuth(
          provider: 'google', redirectUrl: '${Env.appDomain}/profile');
    } catch (e) {
      debugPrint('Google Sign-In Error: $e');
    }
  }

  static Future<void> appleSignInSignUpFnc() async {
    try {
      // TODO: Implement OAuth with backend
      final response = await _authService.signInWithOAuth(
          provider: 'apple', redirectUrl: '${Env.appDomain}/profile');
    } catch (e) {
      debugPrint('Apple Sign-In Error: $e');
    }
  }

  static Future<void> spotifySignInSignUpFnc() async {
    try {
      // TODO: Implement OAuth with backend
      final response = await _authService.signInWithOAuth(
          provider: 'spotify', redirectUrl: '${Env.appDomain}/profile');
    } catch (e) {
      debugPrint('Spotify Sign-In Error: $e');
    }
  }

  static loader() {
    return LinearProgressIndicator(
        color: AppColors.textPrimary,
        borderRadius: BorderRadius.circular(12),
        backgroundColor: AppColors.appBg);
  }

  static void listenForUserToken() {
    html.window.onMessage.listen((event) {
      String? userToken = event.data;
      if (userToken != null && userToken.isNotEmpty) {
        print("Music User Token: $userToken");
      }
    });
  }
}
