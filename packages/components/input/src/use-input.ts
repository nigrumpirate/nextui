import type {InputVariantProps, SlotsToClasses, InputSlots} from "@nextui-org/theme";

import {HTMLNextUIProps, mapPropsVariants, PropGetter} from "@nextui-org/system";
import {AriaTextFieldProps} from "@react-types/textfield";
import {useFocusRing} from "@react-aria/focus";
import {input} from "@nextui-org/theme";
import {useDOMRef} from "@nextui-org/dom-utils";
import {useHover, usePress} from "@react-aria/interactions";
import {clsx, dataAttr} from "@nextui-org/shared-utils";
import {useControlledState} from "@react-stately/utils";
import {useMemo, Ref, RefObject} from "react";
import {chain, filterDOMProps, mergeProps} from "@react-aria/utils";

import {useAriaTextField} from "./use-aria-textfield";

export interface Props extends HTMLNextUIProps<"input"> {
  /**
   * Ref to the DOM node.
   */
  ref?: Ref<HTMLInputElement>;
  /**
   * Element to be rendered in the left side of the input.
   */
  startContent?: React.ReactNode;
  /**
   * Element to be rendered in the right side of the input.
   * if you pass this prop and the `onClear` prop, the passed element
   * will have the clear button props and it will be rendered instead of the
   * default clear button.
   */
  endContent?: React.ReactNode;
  /**
   * Classname or List of classes to change the classNames of the element.
   * if `className` is passed, it will be added to the base slot.
   *
   * @example
   * ```ts
   * <Input classNames={{
   *    base:"base-classes",
   *    label: "label-classes",
   *    inputWrapper: "input-wrapper-classes",
   *    input: "input-classes",
   *    clearButton: "clear-button-classes",
   *    description: "description-classes",
   *    errorMessage: "error-message-classes",
   * }} />
   * ```
   */
  classNames?: SlotsToClasses<InputSlots>;
  /**
   * Callback fired when the value is cleared.
   * if you pass this prop, the clear button will be shown.
   */
  onClear?: () => void;
  /**
   * React aria onChange event.
   */
  onValueChange?: AriaTextFieldProps["onChange"];
}

export type UseInputProps = Props & InputVariantProps & Omit<AriaTextFieldProps, "onChange">;

export function useInput(originalProps: UseInputProps) {
  const [props, variantProps] = mapPropsVariants(originalProps, input.variantKeys);

  const {
    ref,
    as,
    label,
    description,
    errorMessage,
    className,
    classNames,
    autoFocus,
    startContent,
    endContent,
    onClear,
    onChange,
    onValueChange,
    ...otherProps
  } = props;

  const [inputValue, setInputValue] = useControlledState(props.value, props.defaultValue, () => {});

  const Component = as || "div";
  const baseStyles = clsx(classNames?.base, className, !!inputValue ? "is-filled" : "");
  const isMultiline = originalProps.isMultiline;

  const domRef = useDOMRef(ref) as typeof isMultiline extends "true"
    ? RefObject<HTMLTextAreaElement>
    : RefObject<HTMLInputElement>;

  const handleClear = () => {
    setInputValue(undefined);

    if (domRef.current) {
      domRef.current.value = "";
      domRef.current.focus();
    }
    onClear?.();
  };

  const {labelProps, inputProps, descriptionProps, errorMessageProps} = useAriaTextField(
    {
      ...originalProps,
      inputElementType: isMultiline ? "textarea" : "input",
      value: inputValue,
      onChange: chain(onValueChange, setInputValue),
    },
    domRef,
  );

  const {isFocusVisible, isFocused, focusProps} = useFocusRing({
    autoFocus,
    isTextInput: true,
  });

  const {isHovered, hoverProps} = useHover({isDisabled: !!originalProps?.isDisabled});

  const {focusProps: clearFocusProps, isFocusVisible: isClearButtonFocusVisible} = useFocusRing();

  const {pressProps: clearPressProps} = usePress({
    isDisabled: !!originalProps?.isDisabled,
    onPress: handleClear,
  });

  const isInvalid = props.validationState === "invalid";
  const labelPlacement = originalProps.labelPlacement || "inside";
  const isLabelPlaceholder =
    !props.placeholder && labelPlacement !== "outside-left" && !isMultiline;
  const isClearable = !!onClear || originalProps.isClearable;
  const hasElements = !!label || !!description || !!errorMessage;

  const shouldLabelBeOutside = labelPlacement === "outside" || labelPlacement === "outside-left";
  const shouldLabelBeInside = labelPlacement === "inside";

  const hasStartContent = !!startContent;

  const slots = useMemo(
    () =>
      input({
        ...variantProps,
        isInvalid,
        isClearable,
        isLabelPlaceholder: isLabelPlaceholder && !hasStartContent,
      }),
    [...Object.values(variantProps), isInvalid, isClearable, isLabelPlaceholder, hasStartContent],
  );

  const getBaseProps: PropGetter = (props = {}) => {
    return {
      className: slots.base({class: baseStyles}),
      "data-focus-visible": dataAttr(isFocusVisible),
      "data-readonly": dataAttr(originalProps.isReadOnly),
      "data-focus": dataAttr(isFocused),
      "data-hover": dataAttr(isHovered),
      "data-required": dataAttr(originalProps.isRequired),
      "data-invalid": dataAttr(isInvalid),
      "data-disabled": dataAttr(originalProps.isDisabled),
      "data-has-elements": dataAttr(hasElements),
      ...props,
    };
  };

  const getLabelProps: PropGetter = (props = {}) => {
    return {
      className: slots.label({class: classNames?.label}),
      ...labelProps,
      ...props,
    };
  };

  const getInputProps: PropGetter = (props = {}) => {
    return {
      ref: domRef,
      className: slots.input({class: clsx(classNames?.input, !!inputValue ? "is-filled" : "")}),
      ...mergeProps(focusProps, inputProps, filterDOMProps(otherProps, {labelable: true}), props),
      onChange: chain(inputProps.onChange, onChange),
    };
  };

  const getInputWrapperProps: PropGetter = (props = {}) => {
    return {
      "data-hover": dataAttr(isHovered),
      className: slots.inputWrapper({
        class: clsx(classNames?.inputWrapper, !!inputValue ? "is-filled" : ""),
      }),
      onClick: (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          domRef.current?.focus();
        }
      },
      ...mergeProps(props, hoverProps),
      style: {
        cursor: "text",
        ...props.style,
      },
    };
  };

  const getInnerWrapperProps: PropGetter = (props = {}) => {
    return {
      ...props,
      className: slots.innerWrapper({
        class: clsx(classNames?.innerWrapper, props?.className),
      }),
    };
  };

  const getDescriptionProps: PropGetter = (props = {}) => {
    return {
      ...props,
      ...descriptionProps,
      className: slots.description({class: clsx(classNames?.description, props?.className)}),
    };
  };

  const getErrorMessageProps: PropGetter = (props = {}) => {
    return {
      ...props,
      ...errorMessageProps,
      className: slots.errorMessage({class: clsx(classNames?.errorMessage, props?.className)}),
    };
  };

  const getClearButtonProps: PropGetter = (props = {}) => {
    return {
      ...props,
      role: "button",
      tabIndex: 0,
      "data-focus-visible": dataAttr(isClearButtonFocusVisible),
      className: slots.clearButton({class: clsx(classNames?.clearButton, props?.className)}),
      ...mergeProps(clearPressProps, clearFocusProps),
    };
  };

  return {
    Component,
    classNames,
    domRef,
    label,
    description,
    startContent,
    endContent,
    labelPlacement,
    isClearable,
    isInvalid,
    shouldLabelBeOutside,
    shouldLabelBeInside,
    errorMessage,
    getBaseProps,
    getLabelProps,
    getInputProps,
    getInputWrapperProps,
    getInnerWrapperProps,
    getDescriptionProps,
    getErrorMessageProps,
    getClearButtonProps,
  };
}

export type UseInputReturn = ReturnType<typeof useInput>;
