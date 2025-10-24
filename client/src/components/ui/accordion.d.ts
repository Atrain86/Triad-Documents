import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
declare const Accordion: import("react").ForwardRefExoticComponent<(AccordionPrimitive.AccordionSingleProps | AccordionPrimitive.AccordionMultipleProps) & import("react").RefAttributes<HTMLDivElement>>;
declare const AccordionItem: React.ForwardRefExoticComponent<Omit<AccordionPrimitive.AccordionItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
declare const AccordionTrigger: React.ForwardRefExoticComponent<Omit<AccordionPrimitive.AccordionTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<never>>;
declare const AccordionContent: React.ForwardRefExoticComponent<Omit<AccordionPrimitive.AccordionContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<never>>;
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
