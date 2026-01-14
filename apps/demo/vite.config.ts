import { defineConfig } from 'vite';
import markdownPlugin from '@quebi/vite-plugin-markdown';

export default defineConfig({
  plugins: [
    markdownPlugin({
      directory: 'docs',
      parseFrontmatter: true,
      parseMarkdown: true,
      generateTypes: true,
      typesOutputPath: 'types/markdown.d.ts',
    }),
  ],
});
