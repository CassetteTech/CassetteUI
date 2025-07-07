import 'package:cassettefrontend/core/common_widgets/animated_primary_button.dart';
import 'package:cassettefrontend/core/common_widgets/app_scaffold.dart';
import 'package:cassettefrontend/core/common_widgets/app_toolbar.dart';
import 'package:cassettefrontend/core/common_widgets/text_field_widget.dart';
import 'package:cassettefrontend/core/constants/app_constants.dart';
import 'package:cassettefrontend/core/constants/image_path.dart';
import 'package:cassettefrontend/core/services/spotify_service.dart';
import 'package:cassettefrontend/core/services/apple_music_service.dart';
import 'package:cassettefrontend/core/styles/app_styles.dart';
import 'package:cassettefrontend/core/utils/app_utils.dart';
import 'package:cassettefrontend/feature/profile/model/user_profile_models.dart';
import 'package:cassettefrontend/feature/profile/services/profile_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';
import 'package:go_router/go_router.dart';
import 'package:cassettefrontend/core/services/auth_service.dart';
import 'package:cassettefrontend/core/services/api_service.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:logging/logging.dart';

class EditProfilePage extends StatefulWidget {
  const EditProfilePage({super.key});

  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  final _logger = Logger('EditProfilePage');
  bool isMenuVisible = false;
  int value = 0;
  bool _isUsernameValid = true;
  String _usernameError = '';
  bool _isSaveOnCooldown = false;

  TextEditingController nameCtr = TextEditingController();
  TextEditingController userNameCtr = TextEditingController();
  TextEditingController linkCtr = TextEditingController();
  TextEditingController bioCtr = TextEditingController();

  List<ConnectedService> allServicesList = [];
  final _authService = AuthService();
  late final ApiService _apiService;
  late final ProfileService _profileService;

  Map<String, dynamic> userData = {};
  bool isLoading = true;

  @override
  void initState() {
    super.initState();

    _apiService = ApiService(_authService);
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    _profileService = ProfileService(_apiService);
    _logger.info(
        '🔍 [EditProfilePage] Loading user data from ${'${ApiService.baseUrl}/user/profile'}');
    setState(() => isLoading = true);
    // final userData1 = await _authService.getCurrentUser(forceRefresh: true);
    // print(userData1?.entries);
    try {
      Map<String, dynamic>? cachedUserData =
          await _authService.getCurrentUser(forceRefresh: false);
      if (cachedUserData != null) {
        userData = cachedUserData;
        setState(() {
          userData = userData;
          nameCtr.text = userData['fullName'] ?? '';
          userNameCtr.text = userData['username'] ?? '';
          bioCtr.text = userData['bio'] ?? '';
          linkCtr.text = userData['avatarUrl'] ?? '';
          isLoading = false;
        });
      } else {
        final headers = await _authService.authHeaders;
        final response = await http.get(
          Uri.parse('${ApiService.baseUrl}/profile/${userData['id']}/bio'),
          headers: headers,
        );
        print('🔍 [EditProfilePage] Response: ${response.body}');

        if (response.statusCode == 200) {
          final data = json.decode(response.body);
          if (data['success'] == true) {
            setState(() {
              userData = data['user'];
              nameCtr.text = userData['fullName'] ?? '';
              userNameCtr.text = userData['username'] ?? '';
              bioCtr.text = userData['bio'] ?? '';
              linkCtr.text = userData['avatarUrl'] ?? '';
              isLoading = false;
            });
          }
        }
      }
    } catch (e) {
      _logger.warning('Error loading user data: $e');
      setState(() => isLoading = false);
    }
  }

  Future<void> _checkUsernameAvailability(String username) async {
    try {
      final headers = await _authService.authHeaders;
      final response = await http.get(
        Uri.parse('${ApiService.baseUrl}/user/check-username/$username'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (!data['available']) {
          setState(() {
            _isUsernameValid = false;
            _usernameError =
                'Username already exists. Please choose a different one.';
          });
          return;
        }
      }
    } catch (e) {
      _logger.warning('Error checking username availability: $e');
    }
  }

  Future<void> _updateProfile({
    required String username,
    required String fullName,
    required String bio,
    required String avatarUrl,
  }) async {
    try {
      final headers = await _authService.authHeaders;
      final response = await http.put(
        Uri.parse('${ApiService.baseUrl}/user/profile'),
        headers: headers,
        body: json.encode({
          'username': username,
          'fullName': fullName,
          'bio': bio,
          'avatarUrl': avatarUrl,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to update profile');
      }

      final data = json.decode(response.body);
      if (!data['success']) {
        throw Exception(data['message'] ?? 'Failed to update profile');
      }
    } catch (e) {
      throw Exception('Error updating profile: $e');
    }
  }

  bool _validateUsername(String username) {
    if (username.isEmpty) {
      setState(() {
        _isUsernameValid = false;
        _usernameError = 'Username cannot be empty';
      });
      return false;
    }

    if (username.length < 3) {
      setState(() {
        _isUsernameValid = false;
        _usernameError = 'Username must be at least 3 characters long';
      });
      return false;
    }

    if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(username)) {
      setState(() {
        _isUsernameValid = false;
        _usernameError =
            'Username can only contain letters, numbers, and underscores';
      });
      return false;
    }

    setState(() {
      _isUsernameValid = true;
      _usernameError = '';
    });
    return true;
  }

  Future<void> _saveChanges() async {
    if (_isSaveOnCooldown) {
      return;
    }

    print('💾 [Profile] Attempting to save profile changes');

    if (!_validateUsername(userNameCtr.text)) {
      if (!mounted) return;
      AppUtils.showToast(context: context, title: _usernameError);
      _startCooldown();
      return;
    }

    try {
      if (userNameCtr.text != userData['username']) {
        print('🔍 [Profile] Username changed, checking availability');
        await _checkUsernameAvailability(userNameCtr.text);
        if (!_isUsernameValid) {
          if (!mounted) return;
          AppUtils.showToast(context: context, title: _usernameError);
          _startCooldown();
          return;
        }
      }

      print('🔄 [Profile] Updating profile with bio: ${bioCtr.text}');
      await _updateProfile(
        username: userNameCtr.text,
        fullName: nameCtr.text,
        bio: bioCtr.text,
        avatarUrl: linkCtr.text,
      );

      if (!mounted) return;
      AppUtils.showToast(
        context: context,
        title: "Profile updated successfully",
      );

      print('✅ [Profile] Profile saved successfully, refreshing user data');
      // Refresh user data to ensure it's up to date
      final updatedUser = await _authService.getCurrentUser(forceRefresh: true);
      print('👤 [Profile] Updated user data: $updatedUser');

      if (!mounted) return;
      print('🔄 [Profile] Navigating to profile page');
      context.go('/profile');
    } catch (e) {
      _logger.warning('Error saving profile changes: $e');
      print('❌ [Profile] Error saving changes: $e');
      if (!mounted) return;
      AppUtils.showToast(
        context: context,
        title: e.toString(),
      );
      _startCooldown();
    }
  }

  void _startCooldown() {
    setState(() => _isSaveOnCooldown = true);
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _isSaveOnCooldown = false);
    });
  }

  Future<void> _uploadImage(String filePath) async {
    try {
      if (!mounted) return;
      AppUtils.showToast(
        context: context,
        title: "Image upload functionality coming soon",
      );
    } catch (e) {
      _logger.warning('Error uploading image: $e');
      if (!mounted) return;
      AppUtils.showToast(
        context: context,
        title: "Error uploading image",
      );
    }
  }

  Future<void> _pickImage() async {
    try {
      final image = await AppUtils.uploadPhoto();
      if (image != null) {
        await _uploadImage(image.path);
      }
    } catch (e) {
      _logger.warning('Error picking image: $e');
      if (!mounted) return;
      AppUtils.showToast(
        context: context,
        title: "Error uploading image",
      );
    }
  }

  fillAllServices() {
    allServicesList
      ..add(
          ConnectedService(serviceType: "Spotify", connectedAt: DateTime.now()))
      ..add(ConnectedService(
          serviceType: "Apple Music", connectedAt: DateTime.now()))
      ..add(ConnectedService(
          serviceType: "YouTube Music", connectedAt: DateTime.now()))
      ..add(ConnectedService(serviceType: "Tidal", connectedAt: DateTime.now()))
      ..add(
          ConnectedService(serviceType: "Deezer", connectedAt: DateTime.now()));
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showGraphics: true,
      onBurgerPop: () {
        setState(() {
          isMenuVisible = !isMenuVisible;
        });
      },
      isMenuVisible: isMenuVisible,
      body: SafeArea(
        child: Column(
          children: [
            AppToolbar(
              burgerMenuFnc: () {
                setState(() {
                  isMenuVisible = !isMenuVisible;
                });
              },
            ),
            if (isLoading)
              const Center(child: CircularProgressIndicator())
            else
              Expanded(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        Stack(
                          children: [
                            Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                border: Border.all(
                                  width: 4,
                                  color:
                                      Theme.of(context).scaffoldBackgroundColor,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    spreadRadius: 2,
                                    blurRadius: 10,
                                    color: Colors.black.withOpacity(0.1),
                                    offset: const Offset(0, 10),
                                  ),
                                ],
                                shape: BoxShape.circle,
                                image: DecorationImage(
                                  fit: BoxFit.cover,
                                  image: NetworkImage(
                                    linkCtr.text.isNotEmpty
                                        ? linkCtr.text
                                        : 'https://via.placeholder.com/150',
                                  ),
                                ),
                              ),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                height: 40,
                                width: 40,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    width: 4,
                                    color: Theme.of(context)
                                        .scaffoldBackgroundColor,
                                  ),
                                  color: Colors.green,
                                ),
                                child: InkWell(
                                  onTap: _pickImage,
                                  child: const Icon(
                                    Icons.edit,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 35),
                        TextFieldWidget(
                          hint: 'Full Name',
                          controller: nameCtr,
                          onChanged: (name) {},
                        ),
                        const SizedBox(height: 24),
                        TextFieldWidget(
                          hint: 'Username',
                          controller: userNameCtr,
                          onChanged: (username) {
                            _validateUsername(username);
                          },
                          errorText: _isUsernameValid ? null : _usernameError,
                        ),
                        const SizedBox(height: 24),
                        TextFieldWidget(
                          hint: 'Bio',
                          controller: bioCtr,
                          maxLines: 5,
                          onChanged: (bio) {},
                        ),
                        const SizedBox(height: 35),
                        connectServiceView(),
                        const SizedBox(height: 35),
                        AnimatedPrimaryButton(
                          text: 'Save',
                          onTap: _saveChanges,
                          height: 40,
                          width: MediaQuery.of(context).size.width - 46 + 16,
                          radius: 10,
                          initialPos: 6,
                          topBorderWidth: 3,
                          bottomBorderWidth: 3,
                          colorTop: AppColors.animatedBtnColorConvertTop,
                          textStyle: AppStyles.animatedBtnFreeAccTextStyle,
                          borderColorTop: AppColors.animatedBtnColorConvertTop,
                          colorBottom: AppColors.animatedBtnColorConvertBottom,
                          borderColorBottom:
                              AppColors.animatedBtnColorConvertBottomBorder,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget profileTopView() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        GestureDetector(
          onTap: _pickImage,
          child: SizedBox(
            height: 70,
            width: 70,
            child: Stack(
              children: [
                const SizedBox(
                  width: 65,
                  height: 65,
                  child: CircleAvatar(
                    radius: 30.0,
                    backgroundImage: NetworkImage('placeholder_url'),
                    backgroundColor: Colors.transparent,
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    height: 24,
                    width: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.appBg,
                      border: Border.all(color: AppColors.textPrimary),
                    ),
                    child: const Icon(
                      Icons.edit,
                      color: AppColors.textPrimary,
                      size: 16,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 22),
        Text("Edit Your Profile", style: AppStyles.profileTitleTextStyle),
      ],
    );
  }

  connectServiceView() {
    return Container(
      decoration: BoxDecoration(
          color: AppColors.textPrimary,
          borderRadius: BorderRadius.circular(16)),
      padding: const EdgeInsets.only(top: 8, left: 8, right: 10),
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                  child: Text("Connected Services",
                      style: AppStyles.addServiceTextStyle)),
              const SizedBox(width: 6),
              AnimatedPrimaryButton(
                  text: "Add More",
                  onTap: () {},
                  onTapDown: (details) {
                    Future.delayed(
                      const Duration(milliseconds: 180),
                      () {
                        double tapY = details.globalPosition.dy;
                        openAddServiceDialog(tapY);
                      },
                    );
                  },
                  width: 120,
                  height: 22,
                  radius: 16,
                  textStyle: AppStyles.addMoreBtnTextStyle),
            ],
          ),
          const SizedBox(height: 24),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: AppUtils.userProfile.connectedServices.length,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: serviceRow(
                    AppUtils.userProfile.connectedServices[index].serviceType),
              );
            },
          ),
        ],
      ),
    );
  }

  labelTextFieldWidget() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text("Name",
                textAlign: TextAlign.left,
                style: AppStyles.authTextFieldLabelTextStyle),
          ),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child:
                TextFieldWidget(hint: "Enter your name", controller: nameCtr),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text("Username",
                        textAlign: TextAlign.left,
                        style: AppStyles.authTextFieldLabelTextStyle),
                    const SizedBox(width: 8),
                    Text("(required)",
                        style: AppStyles.authTextFieldLabelTextStyle.copyWith(
                            color: Colors.red,
                            fontSize: 12,
                            fontStyle: FontStyle.italic)),
                  ],
                ),
                const SizedBox(height: 4),
                Text("Choose a unique username (30 characters max)",
                    style: AppStyles.authTextFieldLabelTextStyle
                        .copyWith(fontSize: 12, fontStyle: FontStyle.italic)),
                Text("Letters, numbers, and underscores only",
                    style: AppStyles.authTextFieldLabelTextStyle
                        .copyWith(fontSize: 12, fontStyle: FontStyle.italic)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextFieldWidget(
                hint: "Choose your username",
                controller: userNameCtr,
                errorText: !_isUsernameValid ? _usernameError : null,
                onChanged: (value) => _validateUsername(value)),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text("Link",
                textAlign: TextAlign.left,
                style: AppStyles.authTextFieldLabelTextStyle),
          ),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child:
                TextFieldWidget(hint: "Enter your link", controller: linkCtr),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text("Bio",
                textAlign: TextAlign.left,
                style: AppStyles.authTextFieldLabelTextStyle),
          ),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextFieldWidget(
                hint: "Enter your bio",
                controller: bioCtr,
                maxLines: 6,
                minLines: 6,
                height: 160,
                height2: 156),
          ),
        ],
      ),
    );
  }

  serviceRow(serviceName) {
    return Row(
      children: [
        getServiceIcon(serviceName),
        const SizedBox(width: 8),
        Expanded(
            child: Text(serviceName,
                style: AppStyles.editProfileServicesTextStyle)),
        InkWell(
            onTap: () {
              setState(() {
                AppUtils.userProfile.connectedServices.removeWhere(
                    (element) => element.serviceType == serviceName);
              });
            },
            child: Image.asset(icDelete, fit: BoxFit.scaleDown, height: 22)),
      ],
    );
  }

  serviceIcon(image, color, {double? height}) {
    return Image.asset(image,
        height: height ?? 22, fit: BoxFit.contain, color: color);
  }

  getServiceIcon(String serviceName, {double? iconHeight}) {
    switch (serviceName) {
      case "Spotify":
        return serviceIcon(icSpotify, AppColors.greenAppColor,
            height: iconHeight);
      case "Apple Music":
        return serviceIcon(icApple, AppColors.animatedBtnColorToolBarTop,
            height: iconHeight);
      case "YouTube Music":
        return serviceIcon(icYtMusic, AppColors.animatedBtnColorToolBarTop,
            height: iconHeight);
      case "Tidal":
        return serviceIcon(icTidal, AppColors.textPrimary, height: iconHeight);
      case "Deezer":
        return serviceIcon(icDeezer, AppColors.textPrimary, height: iconHeight);
      default:
        return serviceIcon(icSpotify, AppColors.greenAppColor,
            height: iconHeight);
    }
  }

  openAddServiceDialog(tapY) {
    value = 0;
    allServicesList.clear();
    fillAllServices();
    if (AppUtils.userProfile.connectedServices != null &&
        AppUtils.userProfile.connectedServices.isNotEmpty) {
      for (var i in AppUtils.userProfile.connectedServices) {
        allServicesList
            .removeWhere((element) => element.serviceType == i.serviceType);
      }
    }
    SmartDialog.show(
      alignment:
          Alignment(0, (tapY / MediaQuery.of(context).size.height) * 2 - 1),
      builder: (BuildContext ctx2) {
        return StatefulBuilder(
            builder: (BuildContext ctx, StateSetter setState2) {
          return Container(
            padding: const EdgeInsets.all(10),
            margin: EdgeInsets.symmetric(
                horizontal: MediaQuery.of(context).size.width / 6),
            decoration: const BoxDecoration(
              color: AppColors.colorWhite,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("Select a service",
                        style: AppStyles.dialogTitleTextStyle),
                    const SizedBox(width: 5),
                    InkWell(
                      onTap: () {
                        SmartDialog.dismiss();
                      },
                      child: const Icon(Icons.close,
                          color: AppColors.blackColor, size: 18),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: allServicesList.length,
                  itemBuilder: (context, index) {
                    return AppUtils.userProfile.connectedServices
                                ?.map((e) => e.serviceType)
                                .toList()
                                .contains(allServicesList[index].serviceType) ??
                            false
                        ? SizedBox()
                        : RadioListTile(
                            contentPadding: EdgeInsets.zero,
                            activeColor: AppColors.textPrimary,
                            value: index,
                            groupValue: value,
                            dense: true,
                            controlAffinity: ListTileControlAffinity.trailing,
                            onChanged: (ind) {
                              setState2(() => value = index);
                            },
                            title: Row(
                              children: [
                                getServiceIcon(
                                    allServicesList[index].serviceType ?? '',
                                    iconHeight: 18),
                                const SizedBox(width: 6),
                                Text(
                                  allServicesList[index].serviceType ?? '',
                                  style: AppStyles.dialogItemsTextStyle,
                                ),
                              ],
                            ),
                          );
                  },
                ),
                const SizedBox(height: 12),
                AnimatedPrimaryButton(
                  text: "Add Service",
                  onTap: () {
                    Future.delayed(
                      const Duration(milliseconds: 180),
                      () {
                        SmartDialog.dismiss();
                        addServiceFnc();
                      },
                    );
                  },
                  height: 35,
                  width: MediaQuery.of(context).size.width / 1.69,
                  radius: 12,
                  initialPos: 4,
                  colorTop: AppColors.animatedBtnColorConvertTop,
                  textStyle: AppStyles.animatedBtnAddServiceDialogTextStyle,
                  borderColorTop: AppColors.animatedBtnColorConvertTop,
                  colorBottom: AppColors.animatedBtnColorConvertBottom,
                  borderColorBottom:
                      AppColors.animatedBtnColorConvertBottomBorder,
                ),
                const SizedBox(height: 16),
              ],
            ),
          );
        });
      },
    );
  }

  addServiceFnc() {
    if (allServicesList.isNotEmpty) {
      AppUtils.userProfile.connectedServices.add(ConnectedService(
          serviceType: allServicesList[value].serviceType,
          connectedAt: DateTime.now()));
      switch (allServicesList[value].serviceType) {
        case "Apple Music":
          final appleMusicService = AppleMusicService(_authService);
          appleMusicService.initializeAppleMusic();
          break;
        case "Spotify":
          SpotifyService(AuthService()).initiateSpotifyAuthFlow('http://localhost:3000/spotify_callback');
          break;
      }
      setState(() {});
    }
  }
}
