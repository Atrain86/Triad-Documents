import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
declare const ContextMenu: import("react").FC<ContextMenuPrimitive.ContextMenuProps>;
declare const ContextMenuTrigger: import("react").ForwardRefExoticComponent<ContextMenuPrimitive.ContextMenuTriggerProps & import("react").RefAttributes<HTMLSpanElement>>;
declare const ContextMenuGroup: import("react").ForwardRefExoticComponent<ContextMenuPrimitive.ContextMenuGroupProps & import("react").RefAttributes<HTMLDivElement>>;
declare const ContextMenuPortal: import("react").FC<ContextMenuPrimitive.ContextMenuPortalProps>;
declare const ContextMenuSub: import("react").FC<ContextMenuPrimitive.ContextMenuSubProps>;
declare const ContextMenuRadioGroup: import("react").ForwardRefExoticComponent<ContextMenuPrimitive.ContextMenuRadioGroupProps & import("react").RefAttributes<HTMLDivElement>>;
declare const ContextMenuSubTrigger: React.ForwardRefExoticComponent<Omit<ContextMenuPrimitive.ContextMenuSubTriggerProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
    inset?: boolean;
} & React.RefAttributes<never>>;
declare const ContextMenuSubContent: React.ForwardRefExoticComponent<Omit<ContextMenuPrimitive.ContextMenuSubContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
declare const ContextMenuContent: React.ForwardRefExoticComponent<Omit<ContextMenuPrimitive.ContextMenuContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
declare const ContextMenuItem: React.ForwardRefExoticComponent<Omit<ContextMenuPrimitive.ContextMenuItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
    inset?: boolean;
} & React.RefAttributes<never>>;
declare const ContextMenuCheckboxItem: React.ForwardRefExoticComponent<Omit<ContextMenuPrimitive.ContextMenuCheckboxItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
declare const ContextMenuRadioItem: React.ForwardRefExoticComponent<Omit<ContextMenuPrimitive.ContextMenuRadioItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
declare const ContextMenuLabel: React.ForwardRefExoticComponent<Omit<ContextMenuPrimitive.ContextMenuLabelProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
    inset?: boolean;
} & React.RefAttributes<never>>;
declare const ContextMenuSeparator: React.ForwardRefExoticComponent<Omit<ContextMenuPrimitive.ContextMenuSeparatorProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
declare const ContextMenuShortcut: {
    ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuRadioGroup, };
