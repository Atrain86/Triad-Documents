import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
declare const HoverCard: import("react").FC<HoverCardPrimitive.HoverCardProps>;
declare const HoverCardTrigger: import("react").ForwardRefExoticComponent<HoverCardPrimitive.HoverCardTriggerProps & import("react").RefAttributes<HTMLAnchorElement>>;
declare const HoverCardContent: React.ForwardRefExoticComponent<Omit<HoverCardPrimitive.HoverCardContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
export { HoverCard, HoverCardTrigger, HoverCardContent };
