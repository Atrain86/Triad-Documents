import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
declare const Drawer: {
    ({ shouldScaleBackground, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
declare const DrawerTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-dialog").DialogTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
declare const DrawerPortal: typeof import("vaul").Portal;
declare const DrawerClose: import("react").ForwardRefExoticComponent<import("@radix-ui/react-dialog").DialogCloseProps & import("react").RefAttributes<HTMLButtonElement>>;
declare const DrawerOverlay: React.ForwardRefExoticComponent<Omit<Omit<import("@radix-ui/react-dialog").DialogOverlayProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
declare const DrawerContent: React.ForwardRefExoticComponent<Omit<Omit<import("@radix-ui/react-dialog").DialogContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
declare const DrawerHeader: {
    ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
declare const DrawerFooter: {
    ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
declare const DrawerTitle: React.ForwardRefExoticComponent<Omit<import("@radix-ui/react-dialog").DialogTitleProps & import("react").RefAttributes<HTMLHeadingElement>, "ref"> & React.RefAttributes<never>>;
declare const DrawerDescription: React.ForwardRefExoticComponent<Omit<import("@radix-ui/react-dialog").DialogDescriptionProps & import("react").RefAttributes<HTMLParagraphElement>, "ref"> & React.RefAttributes<never>>;
export { Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription, };
