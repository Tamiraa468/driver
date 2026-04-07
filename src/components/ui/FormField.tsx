import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Radius,
  Spacing,
} from "../../constants/design";

interface FormFieldProps extends TextInputProps {
  label: string;
  errorText?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  errorText,
  helperText,
  leftElement,
  rightElement,
  containerStyle,
  inputStyle,
  multiline = false,
  ...inputProps
}) => {
  const hasError = Boolean(errorText);

  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, hasError ? styles.inputWrapError : null]}>
        {leftElement ? <View style={styles.leftElement}>{leftElement}</View> : null}
        <TextInput
          multiline={multiline}
          placeholderTextColor={Colors.textMuted}
          style={[
            styles.input,
            multiline ? styles.inputMultiline : null,
            inputStyle,
          ]}
          {...inputProps}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      {!errorText && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSoft,
    marginBottom: Spacing.xs + 4,
  },
  inputWrap: {
    minHeight: Layout.inputHeight,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  inputWrapError: {
    borderColor: Colors.borderStrong,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text,
    paddingVertical: 15,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  leftElement: {
    marginRight: Spacing.sm + 2,
  },
  rightElement: {
    marginLeft: Spacing.sm,
  },
  error: {
    marginTop: Spacing.xs + 2,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  helper: {
    marginTop: Spacing.xs + 2,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});

export default FormField;
