import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
declare const Avatar: React.ForwardRefExoticComponent<Omit<AvatarPrimitive.AvatarProps & import("react").RefAttributes<HTMLSpanElement>, "ref"> & React.RefAttributes<never>>;
declare const AvatarImage: React.ForwardRefExoticComponent<Omit<AvatarPrimitive.AvatarImageProps & import("react").RefAttributes<HTMLImageElement>, "ref"> & React.RefAttributes<never>>;
declare const AvatarFallback: React.ForwardRefExoticComponent<Omit<AvatarPrimitive.AvatarFallbackProps & import("react").RefAttributes<HTMLSpanElement>, "ref"> & React.RefAttributes<never>>;
export { Avatar, AvatarImage, AvatarFallback };
