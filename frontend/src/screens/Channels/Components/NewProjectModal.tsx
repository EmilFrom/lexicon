import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';

import { Text, TextInput, Icon } from '../../../core-ui';
import { TextArea } from '../../../components';
import { useCreateProject } from '../../../hooks';
import { makeStyles, useTheme } from '../../../theme';
import { t } from '../../../i18n/translate';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (categoryId: number) => void;
};

type FormData = {
  name: string;
  description: string;
  slug: string;
  color: string;
  textColor: string;
  createChat: boolean;
  chatChannelName: string;
  chatChannelDescription: string;
};

// Default Discourse category colors (matching admin UI)
const DEFAULT_COLORS = [
  '#E45735', // Red
  '#D19B46', // Orange
  '#8AB33F', // Green
  '#00B26B', // Teal
  '#0088CC', // Blue (default)
  '#9933CC', // Purple
  '#E91E63', // Pink
  '#795548', // Brown
  '#000000', // Black
  '#808080', // Gray
  '#FF9800', // Orange
  '#4CAF50', // Light Green
];

const TEXT_COLORS = ['#FFFFFF', '#000000']; // White, Black

export function NewProjectModal({ visible, onClose, onSuccess }: Props) {
  const styles = useStyles();
  const { colors, spacing } = useTheme();
  const { createProject, loading } = useCreateProject();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      slug: '',
      color: '0088CC', // Default Discourse blue (without #)
      textColor: 'FFFFFF', // Default white (without #)
      createChat: false,
      chatChannelName: 'General',
      chatChannelDescription: '',
    },
  });

  const createChat = watch('createChat');
  const name = watch('name');
  const color = watch('color');

  // Auto-generate slug from name
  useEffect(() => {
    if (name) {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', slug, { shouldValidate: true });
    }
  }, [name, setValue]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    if (loading) return;

    try {
      const result = await createProject({
        variables: {
          createProjectInput: {
            name: data.name.trim(),
            description: data.description.trim() || undefined,
            color: data.color,
            create_chat: data.createChat,
            chat_channel_name: data.createChat ? data.chatChannelName.trim() : undefined,
            chat_channel_description: data.createChat
              ? data.chatChannelDescription.trim() || undefined
              : undefined,
          },
        },
      });

      if (result.data?.createProject) {
        const categoryId = result.data.createProject.category.id;
        handleClose();
        onSuccess?.(categoryId);
      }
    } catch (error) {
      // Error handling is done by the hook via errorHandlerAlert
      // Just log for debugging
      console.error('Failed to create project:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>{t('Cancel')}</Text>
          </TouchableOpacity>
          <Text variant="semiBold" size="l">
            {t('New Project')}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Name */}
          <View style={styles.fieldContainer}>
            <Controller
              control={control}
              name="name"
              rules={{
                required: t('Category name is required'),
                maxLength: {
                  value: 50,
                  message: t('Name is too long (max 50 characters)'),
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={t('Category name')}
                  placeholder={t('One or two words maximum')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.name}
                  errorMsg={errors.name?.message}
                  maxLength={50}
                />
              )}
            />
          </View>

          {/* Category Slug */}
          <View style={styles.fieldContainer}>
            <Controller
              control={control}
              name="slug"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={t('Category slug') + ' (' + t('Optional') + ')'}
                  placeholder={t('(Optional) dashed-words for url')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Controller
              control={control}
              name="description"
              rules={{
                maxLength: {
                  value: 1000,
                  message: t('Description is too long (max 1000 characters)'),
                },
              }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text size="s" style={styles.label}>
                    {t('Description')} ({t('Optional')})
                  </Text>
                  <TextArea
                    value={value}
                    onChangeValue={onChange}
                    placeholder={t('Enter description...')}
                    onSelectedChange={() => {}}
                    inputRef={React.createRef()}
                    isKeyboardShow={false}
                    mentionToggled={false}
                  />
                  {errors.description && (
                    <Text size="s" color="error" style={styles.errorText}>
                      {errors.description.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>

          {/* Color Picker */}
          <View style={styles.fieldContainer}>
            <Text size="s" style={styles.label}>
              {t('Color')} ({t('Optional')})
            </Text>
            <View style={styles.colorPickerContainer}>
              {/* Color Swatches */}
              <View style={styles.colorSwatches}>
                {DEFAULT_COLORS.map((swatchColor) => {
                  const colorWithoutHash = swatchColor.replace('#', '');
                  const isSelected = color === colorWithoutHash;
                  return (
                    <TouchableOpacity
                      key={swatchColor}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: swatchColor },
                        isSelected && styles.colorSwatchSelected,
                      ]}
                      onPress={() => setValue('color', colorWithoutHash)}
                    />
                  );
                })}
              </View>
              {/* Hex Input */}
              <View style={styles.hexInputContainer}>
                <Text size="s" style={styles.hexLabel}>
                  #
                </Text>
                <Controller
                  control={control}
                  name="color"
                  rules={{
                    pattern: {
                      value: /^[0-9A-Fa-f]{6}$/,
                      message: t('Invalid hex color format'),
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      placeholder="0088CC"
                      value={value}
                      onChangeText={(text) => {
                        const upperText = text.toUpperCase().replace(/[^0-9A-F]/g, '');
                        if (upperText.length <= 6) {
                          onChange(upperText);
                        }
                      }}
                      onBlur={onBlur}
                      maxLength={6}
                      style={styles.hexInput}
                      inputStyle={styles.hexInputText}
                    />
                  )}
                />
                {/* Color Preview */}
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: `#${color || '0088CC'}` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Text Color Picker */}
          <View style={styles.fieldContainer}>
            <Text size="s" style={styles.label}>
              {t('Text color')} ({t('Optional')})
            </Text>
            <View style={styles.colorPickerContainer}>
              <View style={styles.colorSwatches}>
                {TEXT_COLORS.map((swatchColor) => {
                  const colorWithoutHash = swatchColor.replace('#', '');
                  const textColor = watch('textColor');
                  const isSelected = textColor === colorWithoutHash;
                  return (
                    <TouchableOpacity
                      key={swatchColor}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: swatchColor },
                        isSelected && styles.colorSwatchSelected,
                      ]}
                      onPress={() => setValue('textColor', colorWithoutHash)}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          {/* Create Chat Channel Toggle */}
          <View style={styles.fieldContainer}>
            <View style={styles.toggleContainer}>
              <View style={styles.toggleLabelContainer}>
                <Text size="m" style={styles.toggleLabel}>
                  {t('Create chat channel')}
                </Text>
                <Text size="s" style={styles.toggleDescription}>
                  {t('Create a chat channel for this project')}
                </Text>
              </View>
              <Controller
                control={control}
                name="createChat"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.pureWhite}
                  />
                )}
              />
            </View>
          </View>

          {/* Chat Channel Name (shown when toggle is on) */}
          {createChat && (
            <View style={styles.fieldContainer}>
              <Controller
                control={control}
                name="chatChannelName"
                rules={{
                  maxLength: {
                    value: 100,
                    message: t('Chat channel name is too long (max 100 characters)'),
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('Chat channel name') + ' (' + t('Optional') + ')'}
                    placeholder={t('General')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.chatChannelName}
                    errorMsg={errors.chatChannelName?.message}
                    maxLength={100}
                  />
                )}
              />
            </View>
          )}

          {/* Chat Channel Description (shown when toggle is on) */}
          {createChat && (
            <View style={styles.fieldContainer}>
              <Controller
                control={control}
                name="chatChannelDescription"
                rules={{
                  maxLength: {
                    value: 500,
                    message: t(
                      'Chat channel description is too long (max 500 characters)',
                    ),
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text size="s" style={styles.label}>
                      {t('Chat channel description')} ({t('Optional')})
                    </Text>
                    <TextArea
                      value={value}
                      onChangeValue={onChange}
                      placeholder={t('Enter chat channel description...')}
                      onSelectedChange={() => {}}
                      inputRef={React.createRef()}
                      isKeyboardShow={false}
                      mentionToggled={false}
                    />
                    {errors.chatChannelDescription && (
                      <Text size="s" color="error" style={styles.errorText}>
                        {errors.chatChannelDescription.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (!isValid || loading) && styles.createButtonDisabled,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.pureWhite} />
            ) : (
              <Text variant="semiBold" style={styles.createButtonText}>
                {t('Create Project')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    paddingVertical: spacing.s,
  },
  cancelText: {
    color: colors.primary,
    fontSize: 16,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.l,
  },
  fieldContainer: {
    marginBottom: spacing.l,
  },
  label: {
    color: colors.textLight,
    marginBottom: spacing.s,
  },
  errorText: {
    marginTop: spacing.xs,
  },
  colorPickerContainer: {
    marginTop: spacing.s,
  },
  colorSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.m,
    gap: spacing.s,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderColor: colors.primary,
  },
  hexInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  hexLabel: {
    color: colors.textNormal,
    fontSize: 16,
  },
  hexInput: {
    flex: 1,
  },
  hexInputText: {
    fontFamily: 'monospace',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: spacing.m,
  },
  toggleLabel: {
    color: colors.textNormal,
    marginBottom: spacing.xs,
  },
  toggleDescription: {
    color: colors.textLight,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.m,
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.xl,
  },
  createButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.5,
  },
  createButtonText: {
    color: colors.pureWhite,
    fontSize: 16,
  },
}));

