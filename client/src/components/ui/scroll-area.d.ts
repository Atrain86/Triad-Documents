import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
declare const ScrollArea: React.ForwardRefExoticComponent<Omit<ScrollAreaPrimitive.ScrollAreaProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
declare const ScrollBar: React.ForwardRefExoticComponent<Omit<ScrollAreaPrimitive.ScrollAreaScrollbarProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
export { ScrollArea, ScrollBar };
