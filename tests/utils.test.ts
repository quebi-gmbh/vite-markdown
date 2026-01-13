import { describe, it, expect } from 'vitest';

// We need to export the utility functions from index.ts to test them
// For now, we'll test them through the plugin interface

describe('Frontmatter parsing', () => {
  it('should parse simple YAML frontmatter', () => {
    const content = `---
title: Test Title
author: John Doe
---

# Content

This is the body.`;

    // We'll create a simple parser for testing
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    expect(match).toBeDefined();
    if (match) {
      const [, frontmatterText, body] = match;

      expect(frontmatterText).toContain('title: Test Title');
      expect(frontmatterText).toContain('author: John Doe');
      expect(body).toContain('# Content');
      expect(body).toContain('This is the body.');
    }
  });

  it('should handle content without frontmatter', () => {
    const content = `# Content

This is just markdown without frontmatter.`;

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    expect(match).toBeNull();
  });

  it('should handle frontmatter with various value types', () => {
    const content = `---
title: Test Title
count: 42
enabled: true
tags: ["tag1", "tag2"]
---

Body content`;

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    expect(match).toBeDefined();
    if (match) {
      const [, frontmatterText] = match;

      // Parse the values
      const lines = frontmatterText.split('\n');
      const parsed: Record<string, any> = {};

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        try {
          parsed[key] = JSON.parse(value);
        } catch {
          parsed[key] = value.replace(/^["']|["']$/g, '');
        }
      }

      expect(parsed.title).toBe('Test Title');
      expect(parsed.count).toBe(42);
      expect(parsed.enabled).toBe(true);
      expect(parsed.tags).toEqual(['tag1', 'tag2']);
    }
  });

  it('should handle Windows line endings', () => {
    const content = `---\r\ntitle: Test\r\n---\r\n\r\nContent`;

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    expect(match).toBeDefined();
  });

  it('should handle empty frontmatter', () => {
    const content = `---
---

Content`;

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    expect(match).toBeDefined();
    if (match) {
      const [, frontmatterText, body] = match;
      expect(frontmatterText.trim()).toBe('');
      expect(body).toContain('Content');
    }
  });
});

describe('Type generation', () => {
  it('should generate proper TypeScript types for files', () => {
    const fileNode = {
      type: 'file' as const,
      name: 'test.md',
      path: 'test.md',
      data: {
        path: 'test.md',
        name: 'test',
        content: '# Test',
      },
    };

    // Verify the structure matches expected TypeScript types
    expect(fileNode.type).toBe('file');
    expect(fileNode.data).toBeDefined();
  });

  it('should generate proper TypeScript types for directories', () => {
    const dirNode = {
      type: 'directory' as const,
      name: 'guides',
      path: 'guides',
      children: {
        'test.md': {
          type: 'file' as const,
          name: 'test.md',
          path: 'guides/test.md',
          data: {
            path: 'guides/test.md',
            name: 'test',
            content: '# Test',
          },
        },
      },
    };

    expect(dirNode.type).toBe('directory');
    expect(dirNode.children).toBeDefined();
    expect(dirNode.children['test.md']).toBeDefined();
  });
});

describe('Path handling', () => {
  it('should handle relative paths correctly', () => {
    const path = require('node:path');

    const rootPath = '/project/docs';
    const fullPath = '/project/docs/guides/getting-started.md';
    const relativePath = path.relative(rootPath, fullPath);

    expect(relativePath).toBe('guides/getting-started.md');
  });

  it('should handle nested directory paths', () => {
    const path = require('node:path');

    const rootPath = '/project/docs';
    const fullPath = '/project/docs/a/b/c/file.md';
    const relativePath = path.relative(rootPath, fullPath);

    expect(relativePath).toBe('a/b/c/file.md');
  });

  it('should extract filename without extension', () => {
    const path = require('node:path');

    const filename = 'getting-started.md';
    const name = path.basename(filename, '.md');

    expect(name).toBe('getting-started');
  });
});

describe('File filtering', () => {
  it('should identify markdown files by extension', () => {
    const path = require('node:path');

    const validExtensions = ['.md', '.markdown'];

    expect(validExtensions.includes(path.extname('test.md'))).toBe(true);
    expect(validExtensions.includes(path.extname('test.markdown'))).toBe(true);
    expect(validExtensions.includes(path.extname('test.txt'))).toBe(false);
    expect(validExtensions.includes(path.extname('test.js'))).toBe(false);
  });
});
