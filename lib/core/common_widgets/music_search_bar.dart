import 'package:cassettefrontend/core/constants/app_constants.dart';
import 'package:cassettefrontend/core/styles/app_styles.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';

class MusicSearchBar extends StatefulWidget {
  final String hint;
  final double? height;
  final double? height2;
  final TextEditingController controller;
  final Function(String)? onPaste;
  final Function(String)? onSearch;
  final FocusNode? focusNode;
  final TextInputAction? textInputAction;
  final Function(String)? onSubmitted;
  final bool isLoading;
  final VoidCallback? onTap;

  const MusicSearchBar({
    super.key,
    required this.hint,
    required this.controller,
    this.height,
    this.height2,
    this.onPaste,
    this.onSearch,
    this.focusNode,
    this.textInputAction,
    this.onSubmitted,
    this.isLoading = false,
    this.onTap,
  });

  @override
  State<MusicSearchBar> createState() => _MusicSearchBarState();
}

class _MusicSearchBarState extends State<MusicSearchBar> {
  bool _hasContent = false;
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    _hasContent = widget.controller.text.isNotEmpty;
    widget.controller.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    final hasContent = widget.controller.text.isNotEmpty;
    if (_hasContent != hasContent) {
      setState(() {
        _hasContent = hasContent;
      });
    }

    if (hasContent) {
      final text = widget.controller.text.toLowerCase();

      // Simple check for any URL containing the service names
      final isUrl = text.contains('spotify') ||
          text.contains('apple') ||
          text.contains('deezer');

      if (isUrl && widget.onPaste != null) {
        widget.onPaste!(widget.controller.text);
      } else if (!isUrl && widget.onSearch != null) {
        _searchDebounce?.cancel();
        _searchDebounce = Timer(const Duration(milliseconds: 750), () {
          widget.onSearch!(widget.controller.text);
        });
      }
    }
  }

  void _clearText() {
    widget.controller.clear();
    _onTextChanged(); // Ensure text change handler is triggered
    setState(() {
      _hasContent = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height ?? 54,
      width: MediaQuery.of(context).size.width - 32,
      child: Stack(
        children: [
          // Shadow container
          Positioned(
            bottom: 0,
            right: 0,
            child: Container(
              height: widget.height2 ?? 50,
              width: MediaQuery.of(context).size.width - 36,
              decoration: const BoxDecoration(
                color: AppColors.textPrimary,
                borderRadius: BorderRadius.all(Radius.circular(8)),
              ),
            ),
          ),
          // Main container with GestureDetector
          GestureDetector(
            onTap: () {
              // When tapped, request focus on the text field
              widget.focusNode?.requestFocus();
              // Call the onTap callback if provided
              if (widget.onTap != null) {
                widget.onTap!();
              }
            },
            child: Container(
              height: widget.height2 ?? 50,
              width: MediaQuery.of(context).size.width - 36,
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(
                  color: AppColors.textPrimary,
                  width: 1,
                ),
                borderRadius: const BorderRadius.all(Radius.circular(8)),
              ),
              child: MouseRegion(
                cursor: SystemMouseCursors.text,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 15),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: widget.controller,
                          focusNode: widget.focusNode,
                          textInputAction: widget.textInputAction,
                          onTap: widget.onTap,
                          onSubmitted: (value) {
                            // Only unfocus if there's an onSubmitted handler
                            if (widget.onSubmitted != null) {
                              // Let the parent decide whether to unfocus
                              widget.onSubmitted!(value);
                            }
                          },
                          // Ensure keyboard shows on mobile devices
                          keyboardType: TextInputType.text,
                          decoration: InputDecoration(
                            hintText: widget.hint,
                            hintStyle: AppStyles.textFieldHintTextStyle,
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.zero,
                          ),
                          style: AppStyles.textFieldHintTextStyle.copyWith(
                            color: AppColors.textPrimary,
                          ),
                          enableInteractiveSelection: true,
                          mouseCursor: WidgetStateMouseCursor.textable,
                          contextMenuBuilder: (context, editableTextState) {
                            if (SystemContextMenu.isSupported(context)) {
                              return SystemContextMenu.editableText(
                                editableTextState: editableTextState,
                              );
                            }
                            return AdaptiveTextSelectionToolbar.editableText(
                              editableTextState: editableTextState,
                            );
                          },
                          onChanged: (value) => _onTextChanged(),
                        ),
                      ),
                      if (_hasContent)
                        IconButton(
                          icon: const Icon(
                            Icons.clear,
                            color: AppColors.textPrimary,
                            size: 20,
                          ),
                          onPressed: _clearText,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      // Show loading indicator when in loading state
                      if (widget.isLoading)
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          width: 20,
                          height: 20,
                          child: const CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              AppColors.animatedBtnColorConvertTop,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    _searchDebounce?.cancel();
    super.dispose();
  }
}
