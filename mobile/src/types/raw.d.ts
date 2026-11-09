// Vitest loads a file as text with ?raw. Only tests use this, Metro does not understand it.
declare module '*?raw' {
  const content: string;
  export default content;
}
