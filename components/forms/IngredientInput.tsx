import { Pressable, TextInput } from "react-native";
import React, { useEffect, useRef } from "react";

import Animated from "react-native-reanimated";
import { Input } from "../ui/input";

export enum EntityInputState {
  New = "new",
  Dirty = "dirty",
  Parsing = "parsing",
  Parsed = "parsed",
  Editing = "editing",
}

export type EntityInputValue<T> =
  | {
      state:
        | EntityInputState.New
        | EntityInputState.Dirty
        | EntityInputState.Parsing;
      raw: string;
      parsed?: T;
    }
  | {
      state: EntityInputState.Parsed | EntityInputState.Editing;
      raw: string;
      parsed: T;
    };

export interface EntityInputProps<T> {
  value: {
    state: EntityInputState;
    raw: string;
    parsed?: T;
  };
  placeholder?: string;
  onChange: (rawValue: string) => void;
  onSave: () => void;
  onEdit: () => void;
  renderParsed?: (parsed: T) => React.ReactNode;
}

export function EntityInput<T>({
  value,
  onChange,
  onSave,
  onEdit,
  renderParsed,
  placeholder,
}: EntityInputProps<T>) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (inputRef.current && value.state === EntityInputState.Editing) {
      inputRef.current.focus();
    }
  }, [value.state]);

  if (value.state === EntityInputState.Parsing) {
    return (
      <Animated.View
        style={{
          height: 40,
          backgroundColor: "#eee",
          borderRadius: 4,
          marginBottom: 8,
          width: "100%",
          opacity: 0.7,
        }}
      />
    );
  }
  if (value.state === EntityInputState.Parsed && value.parsed) {
    if (renderParsed) {
      return (
        <Pressable
          onPress={onEdit}
          style={{
            minHeight: 40,
            backgroundColor: "#f8f8f8",
            borderRadius: 4,
            marginBottom: 8,
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 8,
          }}
        >
          {renderParsed(value.parsed)}
        </Pressable>
      );
    }
    return null;
  }
  return (
    <Input
      ref={inputRef}
      placeholder={placeholder}
      value={value.raw}
      onChangeText={onChange}
      onSubmitEditing={onSave}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="done"
      onBlur={onSave}
    />
  );
}
