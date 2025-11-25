# Plan: Redesign "View Post" Button on Home Screen

## Analysis

After investigating the codebase, I've identified the following:

### Current Implementation

1. **Location**: The "View Post" button is rendered in [`PostItem.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/PostItem/PostItem.tsx#L353-L357)
2. **Current Style**: Simple text-based button with:
   - Blue text (`color="primary"`)
   - Bold font (`variant="bold"`)
   - Minimal styling (just top margin and left alignment)
3. **Component Structure**: 
   - Used in `HomePostItem` component
   - Rendered when `nonclickable` is `false` (which is the default for home screen posts)
   - Located after the post content and images

### Reference Design Analysis

From the uploaded image, the desired "View Post" button has:
- **Full-width design**: Spans the entire width of the post card
- **Blue background**: Solid blue color (#4F7FFF or similar)
- **White text**: "View Post" in white, centered
- **Rounded corners**: Moderate border radius
- **Padding**: Substantial vertical padding for better touch target
- **Prominent appearance**: Stands out as a clear call-to-action

### Key Differences

| Current | Desired |
|---------|---------|
| Text-only button | Full button with background |
| Left-aligned | Centered |
| Minimal padding | Generous padding |
| No background | Blue background |
| Blue text | White text |
| Subtle appearance | Prominent CTA |

## Proposed Changes

### 1. Update Button Component

**File**: [`PostItem.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/PostItem/PostItem.tsx)

**Changes Required**:

#### A. Replace the Pressable component (lines 353-357)

**Current code**:
```tsx
<Pressable onPress={onPressPost} style={styles.viewPostButton}>
  <Text color="primary" variant="bold">
    {t('View Post')}
  </Text>
</Pressable>
```

**New code**:
```tsx
<Pressable 
  onPress={onPressPost} 
  style={styles.viewPostButton}
  android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
>
  <Text style={styles.viewPostButtonText} variant="bold">
    {t('View Post')}
  </Text>
</Pressable>
```

#### B. Update the styles (lines 425-428)

**Current styles**:
```tsx
viewPostButton: {
  marginTop: spacing.l,
  alignSelf: 'flex-start',
},
```

**New styles**:
```tsx
viewPostButton: {
  marginTop: spacing.l,
  backgroundColor: colors.primary,
  paddingVertical: spacing.l,
  paddingHorizontal: spacing.xxl,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
},
viewPostButtonText: {
  color: colors.background, // White text
  fontSize: fontSizes.m,
},
```

### 2. Optional: Add Hover/Press State

For better user experience, we could add a pressed state:

```tsx
const [isPressed, setIsPressed] = React.useState(false);

// In the Pressable:
<Pressable 
  onPress={onPressPost} 
  style={[
    styles.viewPostButton,
    isPressed && styles.viewPostButtonPressed
  ]}
  onPressIn={() => setIsPressed(true)}
  onPressOut={() => setIsPressed(false)}
  android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
>
  <Text style={styles.viewPostButtonText} variant="bold">
    {t('View Post')}
  </Text>
</Pressable>

// In styles:
viewPostButtonPressed: {
  backgroundColor: colors.primaryDark, // Slightly darker blue
  transform: [{ scale: 0.98 }],
},
```

### 3. Verify Theme Colors

**File**: Check theme configuration to ensure we have appropriate colors

- Verify `colors.primary` matches the blue in the reference image
- Ensure `colors.background` provides good contrast (white text)
- Optionally add `colors.primaryDark` for pressed state

## Implementation Steps

1. **Backup current implementation** (optional but recommended)
2. **Update `PostItem.tsx`**:
   - Modify the Pressable component structure
   - Update the styles in `useStyles`
   - Add pressed state handling (optional)
3. **Test on both platforms**:
   - iOS simulator
   - Android emulator
4. **Verify accessibility**:
   - Ensure button has adequate touch target size (minimum 44x44 points)
   - Test with screen reader
   - Verify color contrast ratio meets WCAG standards
5. **Visual QA**:
   - Compare with reference image
   - Test on different screen sizes
   - Verify spacing and alignment

## Verification Plan

### Manual Testing
1. Run the app on iOS simulator
2. Run the app on Android emulator
3. Navigate to Home screen
4. Verify button appearance matches reference image
5. Test button press interaction
6. Verify navigation to post detail works correctly

### Visual Checks
- [ ] Button spans full width of post card
- [ ] Blue background color matches reference
- [ ] White text is centered
- [ ] Border radius is appropriate
- [ ] Padding provides good touch target
- [ ] Button stands out as primary CTA

### Functional Checks
- [ ] Pressing button navigates to post detail
- [ ] Press feedback is visible (ripple on Android, opacity on iOS)
- [ ] Button works on both platforms
- [ ] Accessibility labels are correct

## Potential Considerations

1. **Consistency**: Should other "View" buttons in the app follow the same design?
2. **Theming**: Does this work with dark mode?
3. **Localization**: Will longer translations fit properly?
4. **Performance**: No performance impact expected (simple style change)

## Files to Modify

1. [`frontend/src/components/PostItem/PostItem.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/PostItem/PostItem.tsx)
   - Lines 353-357 (button component)
   - Lines 425-428 (button styles)

## Estimated Effort

- **Implementation**: 15-30 minutes
- **Testing**: 15-20 minutes
- **Total**: ~45-50 minutes

---

**Ready for approval?** Please review this plan and let me know if you'd like any adjustments before implementation.
