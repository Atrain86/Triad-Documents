import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
declare const Popover: import("react").FC<PopoverPrimitive.PopoverProps>;
declare const PopoverTrigger: import("react").ForwardRefExoticComponent<PopoverPrimitive.PopoverTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
declare const PopoverContent: React.ForwardRefExoticComponent<Omit<PopoverPrimitive.PopoverContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
export { Popover, PopoverTrigger, PopoverContent };
