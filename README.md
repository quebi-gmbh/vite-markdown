# @quebi/vite-plugin-markdown

A Vite plugin that compiles all markdown files within a directory (including subdirectories) into a nested JSON structure exposed as a virtual module with automatic TypeScript type generation.

## Features

- Recursively scans directories for markdown files
- Generates a nested JSON structure matching your folder hierarchy
- Exposes data as a virtual module that can be imported
- Automatic TypeScript type generation for type-safe imports
- Supports frontmatter parsing (YAML)
- Hot Module Replacement (HMR) support - changes to markdown files trigger rebuilds
- Customizable virtual module ID and directory location

## Installation

```bash
npm install @quebi/vite-plugin-markdown
# or
pnpm install @quebi/vite-plugin-markdown
# or
yarn add @quebi/vite-plugin-markdown
```

## Usage

### Basic Setup

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import markdownPlugin from '@quebi/vite-plugin-markdown';

export default defineConfig({
  plugins: [
    markdownPlugin({
      directory: 'docs', // Directory containing markdown files
      virtualModuleId: 'virtual:markdown', // Virtual module ID
      parseFrontmatter: true, // Parse frontmatter from markdown files
      generateTypes: true, // Generate TypeScript declarations
      typesOutputPath: 'types/markdown.d.ts', // Output path for types
    }),
  ],
});
```

### Import the Virtual Module

In your application code:

```typescript
import markdownData from 'virtual:markdown';

console.log(markdownData);
```

### Example Directory Structure

Given this directory structure:

```
docs/
├── README.md
├── guides/
│   ├── getting-started.md
│   └── advanced.md
└── api/
    └── reference.md
```

The plugin will generate a structure like:

```typescript
{
  'README.md': {
    type: 'file',
    name: 'README.md',
    path: 'README.md',
    data: {
      path: 'README.md',
      name: 'README',
      content: '# Welcome\n\nThis is the README...',
      frontmatter: { title: 'Welcome', date: '2024-01-01' },
      body: '# Welcome\n\nThis is the README...'
    }
  },
  'guides': {
    type: 'directory',
    name: 'guides',
    path: 'guides',
    children: {
      'getting-started.md': { /* ... */ },
      'advanced.md': { /* ... */ }
    }
  },
  'api': {
    type: 'directory',
    name: 'api',
    path: 'api',
    children: {
      'reference.md': { /* ... */ }
    }
  }
}
```

## TypeScript Support

The plugin automatically generates TypeScript declarations that match your exact folder structure. This provides full type safety and autocomplete when accessing your markdown data:

```typescript
import markdownData from 'virtual:markdown';

// TypeScript knows the exact structure
const readme = markdownData['README.md'].data?.content;
const guide = markdownData['guides'].children?.['getting-started.md'];
```

The generated types are placed in `types/markdown.d.ts` by default (configurable via `typesOutputPath`).

## Frontmatter Support

The plugin can parse YAML frontmatter from your markdown files:

```markdown
---
title: My Page
author: John Doe
date: 2024-01-01
published: true
---

# Content

Your markdown content here...
```

This frontmatter will be available in the `frontmatter` field, and the content without frontmatter in the `body` field.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `directory` | `string` | `'docs'` | Directory containing markdown files to compile |
| `virtualModuleId` | `string` | `'virtual:markdown'` | Virtual module ID to expose the compiled JSON |
| `include` | `string \| string[]` | `['**/*.md', '**/*.markdown']` | Include patterns for markdown files |
| `exclude` | `string \| string[]` | `['**/node_modules/**']` | Exclude patterns for markdown files |
| `parseFrontmatter` | `boolean` | `true` | Extract frontmatter from markdown files |
| `generateTypes` | `boolean` | `true` | Generate TypeScript declaration file |
| `typesOutputPath` | `string` | `'types/markdown.d.ts'` | Output path for generated type declarations |

## Data Structure

### MarkdownNode

```typescript
interface MarkdownNode {
  type: 'file' | 'directory';
  name: string;
  path: string;
  data?: MarkdownFile; // Only for type='file'
  children?: Record<string, MarkdownNode>; // Only for type='directory'
}
```

### MarkdownFile

```typescript
interface MarkdownFile {
  path: string; // Relative path from directory root
  name: string; // Filename without extension
  content: string; // Raw markdown content
  frontmatter?: Record<string, any>; // Parsed frontmatter
  body?: string; // Content without frontmatter
}
```

## Use Cases

- Documentation sites
- Static site generators
- Content management systems
- Blog systems
- Knowledge bases
- API documentation

## License

MIT

## Author

Florian Pirchmoser

## Repository

[https://github.com/quebi-gmbh/vite-markdown](https://github.com/quebi-gmbh/vite-markdown)
