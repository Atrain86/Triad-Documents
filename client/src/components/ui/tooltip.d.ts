import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
declare const TooltipProvider: import("react").FC<TooltipPrimitive.TooltipProviderProps>;
declare const Tooltip: import("react").FC<TooltipPrimitive.TooltipProps>;
declare const TooltipTrigger: import("react").ForwardRefExoticComponent<TooltipPrimitive.TooltipTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
declare const TooltipContent: React.ForwardRefExoticComponent<Omit<TooltipPrimitive.TooltipContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
