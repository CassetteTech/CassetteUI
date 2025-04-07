import 'package:cassettefrontend/core/common_widgets/animated_primary_button.dart';
import 'package:cassettefrontend/core/common_widgets/app_scaffold.dart';
import 'package:cassettefrontend/core/common_widgets/app_toolbar.dart';
import 'package:cassettefrontend/core/common_widgets/text_field_widget.dart';
import 'package:cassettefrontend/core/constants/app_constants.dart';
import 'package:cassettefrontend/core/constants/image_path.dart';
import 'package:cassettefrontend/core/env.dart';
import 'package:cassettefrontend/core/services/apple_music_service.dart';
import 'package:cassettefrontend/core/services/spotify_service.dart';
import 'package:cassettefrontend/core/styles/app_styles.dart';
import 'package:cassettefrontend/core/utils/app_utils.dart';
import 'package:cassettefrontend/feature/profile/model/profile_model.dart';
import 'package:cassettefrontend/main.dart'; // Import for supabase client
import 'package:flutter/material.dart';
import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_auth_ui/supabase_auth_ui.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class EditProfilePage extends StatefulWidget {
  const EditProfilePage({super.key});

  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  bool isMenuVisible = false;
  int value = 0;
  bool _isUsernameValid = true;
  String _usernameError = '';
  bool _isSaveOnCooldown = false;

  TextEditingController nameCtr = TextEditingController();
  TextEditingController userNameCtr = TextEditingController();
  TextEditingController linkCtr = TextEditingController();
  TextEditingController bioCtr = TextEditingController();

  List<Services> allServicesList = [];

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final user = supabase.auth.currentUser;
    if (user != null) {
      try {
        // Try to fetch existing profile
        final data = await supabase
            .from('Users')
            .select()
            .eq('UserId', user.id)
            .single();

        setState(() {
          String username = data['Username'] ?? '';
          // Don't display temporary usernames
          if (!username.startsWith('temp_')) {
            nameCtr.text = username;
            userNameCtr.text = username;
          }
          bioCtr.text = data['Bio'] ?? '';
          linkCtr.text = data['AvatarUrl'] ?? '';
        });
      } catch (e) {
        print('[DEBUG] No existing profile found, using auth metadata');
        // If no profile exists, use auth metadata
        final metadata = user.userMetadata;
        setState(() {
          String username = metadata?['username'] ?? '';
          // Don't display temporary usernames from metadata either
          if (!username.startsWith('temp_')) {
            nameCtr.text = username;
            userNameCtr.text = username;
          }
          bioCtr.text = metadata?['bio'] ?? '';
          linkCtr.text = metadata?['profile_picture'] ?? '';
        });
      }
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
    if (username.length > 30) {
      setState(() {
        _isUsernameValid = false;
        _usernameError = 'Username must be 30 characters or less';
      });
      return false;
    }
    if (username.startsWith('temp_')) {
      setState(() {
        _isUsernameValid = false;
        _usernameError = 'Username cannot start with "temp_"';
      });
      return false;
    }
    // Add basic character validation
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

    if (!_validateUsername(userNameCtr.text)) {
      AppUtils.showToast(context: context, title: _usernameError);
      _startCooldown();
      return;
    }

    final user = supabase.auth.currentUser;
    if (user != null) {
      try {
        // Check if username exists first
        final existingUser = await supabase
            .from('Users')
            .select('Username')
            .eq('Username', userNameCtr.text)
            .neq('UserId', user.id)
            .maybeSingle();

        if (existingUser != null) {
          if (mounted) {
            AppUtils.showToast(
                context: context,
                title:
                    "Username already exists. Please choose a different one.");
            _startCooldown();
          }
          return;
        }

        // Proceed with updates if username is unique
        await supabase.auth.updateUser(UserAttributes(
          data: {
            'username': userNameCtr.text,
            'bio': bioCtr.text,
            'profile_picture': linkCtr.text,
            'is_temporary_username': false,
          },
        ));

        try {
          await supabase.from('Users').update({
            'Username': userNameCtr.text,
            'Bio': bioCtr.text,
            'AvatarUrl': linkCtr.text,
          }).eq('UserId', user.id);
        } catch (e) {
          print('[DEBUG] Profile update failed, trying insert');
          await supabase.from('Users').insert({
            'UserId': user.id,
            'Username': userNameCtr.text,
            'Email': user.email!,
            'Bio': bioCtr.text,
            'AvatarUrl': linkCtr.text,
            'JoinDate': DateTime.now().toIso8601String()
          });
        }

        if (mounted) {
          AppUtils.showToast(
              context: context, title: "Profile updated successfully");
          context.go('/profile');
        }
      } catch (e) {
        print('[ERROR] Profile save error: $e');
        if (mounted) {
          AppUtils.showToast(context: context, title: "Error updating profile");
          _startCooldown();
        }
      }
    }
  }

  void _startCooldown() {
    setState(() => _isSaveOnCooldown = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _isSaveOnCooldown = false);
      }
    });
  }

  fillAllServices() {
    allServicesList
      ..add(Services(serviceName: "Spotify"))
      ..add(Services(serviceName: "Apple Music"))
      ..add(Services(serviceName: "YouTube Music"))
      ..add(Services(serviceName: "Tidal"))
      ..add(Services(serviceName: "Deezer"));
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
            mainAxisSize: MainAxisSize.min,
            children: [
              // Fixed header section
              Column(
                mainAxisSize: MainAxisSize.min,
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
                ],
              ),

              // Scrollable content
              Expanded(
                child: ClipRect(
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          connectServiceView(),
                          const SizedBox(height: 28),
                          labelTextFieldWidget(),
                          const SizedBox(height: 56),
                          AnimatedPrimaryButton(
                            text: "Save Changes",
                            onTap: () {
                              _saveChanges();
                            },
                            height: 40,
                            width: MediaQuery.of(context).size.width - 46 + 16,
                            radius: 10,
                            initialPos: 6,
                            topBorderWidth: 3,
                            bottomBorderWidth: 3,
                            colorTop: AppColors.animatedBtnColorConvertTop,
                            textStyle: AppStyles.animatedBtnFreeAccTextStyle,
                            borderColorTop:
                                AppColors.animatedBtnColorConvertTop,
                            colorBottom:
                                AppColors.animatedBtnColorConvertBottom,
                            borderColorBottom:
                                AppColors.animatedBtnColorConvertBottomBorder,
                          ),
                          const SizedBox(height: 56),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ));
  }

  profileTopView() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          GestureDetector(
            onTap: () async {
              uploadImageFnc(AppUtils.profileModel.id);
            },
            child: Container(
              // color: Colors.red,
              height: 70,
              width: 70,
              child: Stack(
                children: [
                  SizedBox(
                    width: 65,
                    height: 65,
                    child: CircleAvatar(
                      radius: 30.0,
                      backgroundImage:
                          NetworkImage(AppUtils.profileModel.profilePath ?? ''),
                      backgroundColor: Colors.transparent,
                    ),
                  ),
                  Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.appBg,
                              border: Border.all(color: AppColors.textPrimary)),
                          child: const Icon(
                            Icons.edit,
                            color: AppColors.textPrimary,
                            size: 16,
                          ))),
                ],
              ),
            ),
          ),
          const SizedBox(width: 22),
          Text("Edit Your Profile", style: AppStyles.profileTitleTextStyle),
        ],
      ),
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
            itemCount: AppUtils.profileModel.services?.length,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: serviceRow(
                    AppUtils.profileModel.services?[index].serviceName),
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
                AppUtils.profileModel.services?.removeWhere(
                    (element) => element.serviceName == serviceName);
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
    if (AppUtils.profileModel.services?.isNotEmpty ?? false) {
      for (var i in AppUtils.profileModel.services!) {
        allServicesList
            .removeWhere((element) => element.serviceName == i.serviceName);
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
                    return AppUtils.profileModel.services
                                ?.map((e) => e.serviceName)
                                .toList()
                                .contains(allServicesList[index].serviceName) ??
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
                                    allServicesList[index].serviceName ?? '',
                                    iconHeight: 18),
                                const SizedBox(width: 6),
                                Text(
                                  allServicesList[index].serviceName ?? '',
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

  addServiceFnc() async {
    if (allServicesList.isNotEmpty) {
      setState(() {});
      
      try {
        switch (allServicesList[value].serviceName) {
          case "Apple Music":
            AppUtils.showToast(context: context, title: "Connecting to Apple Music...");
            final appleMusicService = AppleMusicService();
            
            try {
              // Initialize MusicKit
              await appleMusicService.initialize();
              
              // Request user token
              final userToken = await appleMusicService.requestUserToken();
              if (userToken != null) {
                print('Successfully authenticated with Apple Music');
                // Add to services list on success
                AppUtils.profileModel.services
                    ?.add(Services(serviceName: allServicesList[value].serviceName));
                setState(() {});
                AppUtils.showToast(context: context, title: "Connected to Apple Music");
              } else {
                AppUtils.showToast(context: context, title: "Apple Music authorization failed - please try again");
              }
            } catch (e) {
              print('Apple Music authentication error: $e');
              AppUtils.showToast(context: context, title: "Error connecting to Apple Music: ${e.toString()}");
            }
            break;
          case "Spotify":
            // Start Spotify authentication flow
            SpotifyService.initiateSpotifyAuth(context);
            // Add to services list - this will be confirmed after successful auth
            AppUtils.profileModel.services
                ?.add(Services(serviceName: allServicesList[value].serviceName));
            setState(() {});
            break;
          default:
            // For other services, just add to the list
            AppUtils.profileModel.services
                ?.add(Services(serviceName: allServicesList[value].serviceName));
            setState(() {});
        }
      } catch (e) {
        print('Error during service authentication: $e');
        AppUtils.showToast(context: context, title: "Error connecting to music service");
      }
    }
  }

  uploadImageFnc(userId) async {
    final image = await AppUtils.uploadPhoto();
    if (image != null) {
      final imageBytes = await image.readAsBytes();
      final storagePath =
          'profile/${userId}${DateTime.now().millisecondsSinceEpoch}';
      await Supabase.instance.client.storage
          .from(Env.profileBucket)
          .uploadBinary(
            storagePath,
            imageBytes,
            fileOptions: FileOptions(contentType: image.mimeType, upsert: true),
          )
          .then(
        (value) {
          print("profile uploaded : ${value}");
        },
      );
    }
  }
}
