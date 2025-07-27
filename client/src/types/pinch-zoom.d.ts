declare global {
  namespace JSX {
    interface IntrinsicElements {
      'pinch-zoom': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          children?: React.ReactNode;
        },
        HTMLElement
      >;
    }
  }
}

export {};