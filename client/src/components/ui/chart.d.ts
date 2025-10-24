import * as React from "react";
import * as RechartsPrimitive from "recharts";
type ChartConfig = Record<string, {
    label?: string;
    color?: string;
    icon?: React.ComponentType<{
        className?: string;
    }>;
}>;
export declare function ChartContainer({ config, className, children, }: {
    config: ChartConfig;
    className?: string;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare const ChartTooltip: typeof RechartsPrimitive.Tooltip;
export declare function ChartTooltipContent({ active, payload, label, }: {
    active?: boolean;
    payload?: any;
    label?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function ChartLegendContent({ payload, }: {
    payload?: any[];
}): import("react/jsx-runtime").JSX.Element;
export declare const Chart: typeof RechartsPrimitive;
export {};
