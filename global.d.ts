declare module 'duckduckgo-images-api' {
  export function image_search(params: {
    query: string;
    moderate?: boolean;
    iterations?: number;
    retries?: number;
  }): Promise<any[]>;
}

declare module 'puter' {
  export const puter: any;
}
