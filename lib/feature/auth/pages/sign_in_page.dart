import 'package:cassettefrontend/core/common_widgets/animated_primary_button.dart';
import 'package:cassettefrontend/core/common_widgets/app_scaffold.dart';
import 'package:cassettefrontend/core/common_widgets/auth_toolbar.dart';
import 'package:cassettefrontend/core/common_widgets/text_field_widget.dart';
import 'package:cassettefrontend/core/constants/app_constants.dart';
import 'package:cassettefrontend/core/services/auth_service.dart';
import 'package:cassettefrontend/core/styles/app_styles.dart';
import 'package:cassettefrontend/core/utils/app_utils.dart';
import 'package:cassettefrontend/main.dart';
import 'package:dotted_line/dotted_line.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'dart:async';

class SignInPage extends StatefulWidget {
  const SignInPage({super.key});

  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  bool _isLoading = false;
  bool _isChecked = false;
  bool isMenuVisible = false;
  TextEditingController emailController = TextEditingController();
  TextEditingController passController = TextEditingController();
  Map<String, String> validation = {"": ""};
  final _authService = AuthService();

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
        body: SingleChildScrollView(
          child: Column(
            children: [
              const SizedBox(height: 18),
              AuthToolbar(
                burgerMenuFnc: () {
                  setState(() {
                    isMenuVisible = !isMenuVisible;
                  });
                },
              ),
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text("Welcome back!",
                    textAlign: TextAlign.center,
                    style: AppStyles.signInSignUpTitleTextStyle),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: EdgeInsets.symmetric(
                    horizontal: MediaQuery.of(context).size.width / 6),
                child: Text("Enter your information below to sign in",
                    textAlign: TextAlign.center,
                    style: AppStyles.signInSignUpCenterTextStyle),
              ),
              cmLabelTextFieldWidget(),
              const SizedBox(height: 28),
              tncWidget(),
              const SizedBox(height: 19),
              _isLoading
                  ? Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: AppUtils.loader())
                  : const SizedBox(),
              const SizedBox(height: 19),
              AnimatedPrimaryButton(
                text: "Sign In",
                onTap: () {
                  if (_isLoading) return;
                  Future.delayed(
                    Duration(milliseconds: 180),
                    () {
                      _signIn();
                    },
                  );
                },
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
              const SizedBox(height: 38),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  children: [
                    const Expanded(
                      child: DottedLine(
                          direction: Axis.horizontal,
                          dashColor: AppColors.textPrimary),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6.0),
                      child: Text("OR",
                          style: AppStyles.signInSignUpCenterTextStyle),
                    ),
                    const Expanded(
                      child: DottedLine(
                          direction: Axis.horizontal,
                          dashColor: AppColors.textPrimary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              AppUtils.authLinksWidgets(),
              const SizedBox(height: 26),
              bottomRichText(),
              const SizedBox(height: 22),
            ],
          ),
        ));
  }

  cmLabelTextFieldWidget() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text("Email Address",
                textAlign: TextAlign.left,
                style: AppStyles.authTextFieldLabelTextStyle),
          ),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextFieldWidget(
              hint: "Enter your email address",
              controller: emailController,
              errorText: validation.keys.first == "email"
                  ? validation.values.first
                  : null,
              onChanged: (v) {
                validation = {"": ""};
                setState(() {});
              },
            ),
          ),
          const SizedBox(height: 28),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text("Password",
                textAlign: TextAlign.left,
                style: AppStyles.authTextFieldLabelTextStyle),
          ),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextFieldWidget(
              hint: "Enter your password",
              controller: passController,
              errorText: validation.keys.first == "password"
                  ? validation.values.first
                  : null,
              onChanged: (v) {
                validation = {"": ""};
                setState(() {});
              },
            ),
          ),
        ],
      ),
    );
  }

  tncWidget() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Transform.scale(
                scale: 1.3,
                child: Checkbox(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(2)),
                  side:
                      const BorderSide(color: AppColors.textPrimary, width: 1),
                  activeColor: AppColors.textPrimary,
                  value: _isChecked,
                  onChanged: (bool? value) {
                    setState(() {
                      _isChecked = value ?? false;
                    });
                  },
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    text: 'I have read and agreed to the ',
                    style: AppStyles.tncTextStyle,
                    children: [
                      TextSpan(
                        text: 'Terms of Service',
                        style: AppStyles.tncTextStyle2,
                        recognizer: TapGestureRecognizer()
                          ..onTap = () {
                            // Navigate to Terms of Service page
                            print('Terms of Service clicked');
                          },
                      ),
                      TextSpan(
                        text: ' and ',
                        style: AppStyles.tncTextStyle,
                      ),
                      TextSpan(
                        text: 'Privacy Policy',
                        style: AppStyles.tncTextStyle2,
                        recognizer: TapGestureRecognizer()
                          ..onTap = () {
                            // Navigate to Privacy Policy page
                            print('Privacy Policy clicked');
                          },
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          validation.keys.first != "isChecked"
              ? const SizedBox()
              : Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    validation.values.first,
                    style: AppStyles.textFieldErrorTextStyle,
                  ),
                ),
        ],
      ),
    );
  }

  bottomRichText() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: RichText(
        text: TextSpan(
          text: "Don't have an account yet? ",
          style: AppStyles.bottomRichTextStyle,
          children: [
            TextSpan(
              text: 'Sign Up',
              style: AppStyles.bottomRichTextStyle2,
              recognizer: TapGestureRecognizer()
                ..onTap = () {
                  context.go('/signup');
                },
            ),
          ],
        ),
      ),
    );
  }

  Map<String, String> validateSignInForm() {
    if (emailController.text.isEmpty) {
      validation = {"email": "Please Enter Email"};
    } else if (!Validation.validateEmail(emailController.text)) {
      validation = {"email": "Please Enter A Valid Email"};
    } else if (passController.text.isEmpty) {
      validation = {"password": "Please Enter Password"};
    } else if (passController.text.length < 8) {
      validation = {"password": "Please Enter At-Least 8 Digit Password"};
    } else if (!_isChecked) {
      validation = {
        "isChecked":
            "Please agree to all the terms and conditions before Signing in"
      };
    } else {
      validation = {"": ""};
    }
    setState(() {});
    return validation;
  }

  Future<void> _signIn() async {
    if (validateSignInForm().keys.first != "") return;
    setState(() {
      _isLoading = true;
    });

    StreamSubscription? authSubscription;
    try {
      print('🔐 [SignIn] Starting sign in process');
      
      // Listen to auth state changes
      authSubscription = _authService.authStateChanges.listen(
        (isAuthenticated) {
          print('🔄 [SignIn] Auth state changed: $isAuthenticated');
          if (isAuthenticated && mounted) {
            print('✅ [SignIn] Navigating to profile');
            context.go('/profile');
          }
        },
        onError: (error) {
          print('❌ [SignIn] Auth state change error: $error');
        },
      );

      final response = await _authService.signIn(
        email: emailController.text.trim().toLowerCase(),
        password: passController.text,
      );

      print('📝 [SignIn] Sign in response received: ${response['success']}');

      if (!mounted) {
        print('⚠️ [SignIn] Widget not mounted after sign in');
        authSubscription.cancel();
        return;
      }

      if (response['success'] == true) {
        print('✅ [SignIn] Sign in successful, showing toast');
        AppUtils.showToast(
          context: context,
          title: "Successfully signed in!",
        );
      } else {
        print('❌ [SignIn] Sign in failed: ${response['message']}');
        authSubscription.cancel();
        AppUtils.showToast(
          context: context,
          title: response['message'] ?? "Failed to sign in. Please try again.",
        );
      }
    } catch (error) {
      print("❌ [SignIn] Sign in error: $error");
      if (!mounted) return;

      String errorMessage = error.toString();
      if (errorMessage.contains('invalid credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (errorMessage.contains('not found')) {
        errorMessage = 'Account not found. Please sign up first.';
      }

      AppUtils.showToast(
        context: context,
        title: errorMessage,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
      // Clean up subscription if it exists
      authSubscription?.cancel();
    }
  }
}
