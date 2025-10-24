import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";
declare const ToggleGroup: React.ForwardRefExoticComponent<((Omit<ToggleGroupPrimitive.ToggleGroupSingleProps & import("react").RefAttributes<HTMLDivElement>, "ref"> | Omit<ToggleGroupPrimitive.ToggleGroupMultipleProps & import("react").RefAttributes<HTMLDivElement>, "ref">) & VariantProps<(props?: {
    variant?: "default" | "outline";
    size?: "default" | "sm" | "lg";
} & import("class-variance-authority/types").ClassProp) => string>) & React.RefAttributes<never>>;
declare const ToggleGroupItem: React.ForwardRefExoticComponent<Omit<ToggleGroupPrimitive.ToggleGroupItemProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & VariantProps<(props?: {
    variant?: "default" | "outline";
    size?: "default" | "sm" | "lg";
} & import("class-variance-authority/types").ClassProp) => string> & React.RefAttributes<never>>;
export { ToggleGroup, ToggleGroupItem };
