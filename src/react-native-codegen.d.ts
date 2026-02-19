declare module 'react-native/Libraries/Types/CodegenTypes' {
  export type WithDefault<T, V> = T;
  export type Int32 = number;
  export type Float = number;
  export type Double = number;
  export type BubblingEventHandler<T> = (event: { nativeEvent: T }) => void;
  export type DirectEventHandler<T> = (event: { nativeEvent: T }) => void;
}

declare module 'react-native/Libraries/Utilities/codegenNativeComponent' {
  import type { HostComponent } from 'react-native';
  export default function codegenNativeComponent<P>(
    componentName: string,
    options?: { interfaceOnly?: boolean; paperComponentName?: string }
  ): HostComponent<P>;
}

declare module 'react-native/Libraries/Utilities/codegenNativeCommands' {
  export default function codegenNativeCommands<T>(options: {
    supportedCommands: ReadonlyArray<string>;
  }): T;
}
