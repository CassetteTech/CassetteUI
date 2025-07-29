declare module 'react-vanilla-tilt' {
  import { Component, ReactNode, CSSProperties } from 'react';

  interface TiltOptions {
    max?: number;
    speed?: number;
    scale?: number;
    transition?: boolean;
    axis?: 'x' | 'y' | null;
    reset?: boolean;
    easing?: string;
    glare?: boolean;
    'max-glare'?: number;
    'glare-prerender'?: boolean;
  }

  interface TiltProps {
    options?: TiltOptions;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
  }

  export default class Tilt extends Component<TiltProps> {}
}