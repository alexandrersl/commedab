type ColorName =
  | 'ground'
  | 'surface'
  | 'surface-2'
  | 'ink'
  | 'ink-muted'
  | 'line'
  | 'line-strong'
  | 'action'
  | 'action-soft'
  | 'on-action'
  | 'alert'
  | 'alert-soft'
  | 'scrim'
  | 'skeleton';

declare const tokens: {
  colorNames: ColorName[];
  colors: Record<'light' | 'dark', Record<ColorName, string>>;
  textStyles: {
    name: string;
    fontFamily: string;
    fontSize: string;
    letterSpacing: string | null;
  }[];
  fontNames: string[];
  spacing: Record<string, string>;
  radius: Record<string, string>;
  size: Record<
    | 'control-sm'
    | 'control'
    | 'control-lg'
    | 'row'
    | 'checkbox'
    | 'icon'
    | 'icon-sm'
    | 'icon-xs'
    | 'icon-lg'
    | 'progress'
    | 'tab-bar'
    | 'toggle-w'
    | 'toggle-h'
    | 'toggle-thumb',
    string
  >;
  border: Record<string, string>;
  opacity: Record<'disabled' | 'pending' | 'busy' | 'pressed' | 'pulse', string>;
  scale: Record<'pressed', string>;
  duration: Record<'fast' | 'base' | 'slow', string>;
  easing: Record<'ease-out', string>;
};

export = tokens;
