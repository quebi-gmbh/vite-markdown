import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import markdownPlugin from '../src/index';
import type { Plugin } from 'vite';

describe('markdownPlugin', () => {
  const testRoot = path.resolve(__dirname, 'fixtures');
  const typesPath = path.resolve(testRoot, 'types/markdown.d.ts');

  // Helper function to initialize plugin
  const initPlugin = async (plugin: Plugin, root: string = testRoot) => {
    // Call configResolved
    const configResolvedFn = typeof plugin.configResolved === 'function'
      ? plugin.configResolved
      : (plugin.configResolved as any)?.handler;
    if (configResolvedFn) {
      configResolvedFn.call({}, { root } as any);
    }

    // Call buildStart with proper context
    const buildStartFn = typeof plugin.buildStart === 'function'
      ? plugin.buildStart
      : (plugin.buildStart as any)?.handler;

    if (buildStartFn) {
      await buildStartFn.call({ addWatchFile: () => {} }, {} as any);
    }
  };

  // Helper function to call load hook
  const loadModule = (plugin: Plugin, id: string) => {
    const loadFn = typeof plugin.load === 'function'
      ? plugin.load
      : (plugin.load as any)?.handler;

    return loadFn?.call({}, id, {} as any);
  };

  beforeEach(() => {
    // Clean up any generated files
    if (fs.existsSync(typesPath)) {
      fs.unlinkSync(typesPath);
    }
    const typesDir = path.dirname(typesPath);
    if (fs.existsSync(typesDir)) {
      fs.rmSync(typesDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(typesPath)) {
      fs.unlinkSync(typesPath);
    }
    const typesDir = path.dirname(typesPath);
    if (fs.existsSync(typesDir)) {
      fs.rmSync(typesDir, { recursive: true, force: true });
    }
  });

  it('should create a plugin with default options', async () => {
    const plugin = markdownPlugin() as Plugin;

    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('vite-plugin-markdown');
    expect(plugin.enforce).toBe('pre');
  });

  it('should resolve virtual module ID', async () => {
    const plugin = markdownPlugin({
      virtualModuleId: 'virtual:test-markdown',
    }) as Plugin;

    const resolveIdFn = typeof plugin.resolveId === 'function'
      ? plugin.resolveId
      : (plugin.resolveId as any)?.handler;

    const resolved = resolveIdFn?.call({}, 'virtual:test-markdown', undefined, {} as any);
    expect(resolved).toBe('\0virtual:test-markdown');
  });

  it('should not resolve non-virtual module IDs', async () => {
    const plugin = markdownPlugin() as Plugin;

    const resolveIdFn = typeof plugin.resolveId === 'function'
      ? plugin.resolveId
      : (plugin.resolveId as any)?.handler;

    const resolved = resolveIdFn?.call({}, 'some-other-module', undefined, {} as any);
    expect(resolved).toBeUndefined();
  });

  it('should scan directory and build markdown data', async () => {
    const plugin = markdownPlugin({
      directory: 'docs',
    }) as Plugin;

    await initPlugin(plugin);

    // Load the virtual module
    const code = loadModule(plugin, '\0virtual:markdown');

    expect(code).toBeDefined();
    expect(typeof code).toBe('string');

    // Parse the exported data
    const match = code?.match(/export default (.+);/s);
    expect(match).toBeDefined();

    if (match) {
      const data = JSON.parse(match[1]);

      // Check top-level structure
      expect(data).toHaveProperty('README.md');
      expect(data).toHaveProperty('guides');
      expect(data).toHaveProperty('api');

      // Check README.md file
      expect(data['README.md'].type).toBe('file');
      expect(data['README.md'].name).toBe('README');
      expect(data['README.md'].content).toContain('# Welcome');

      // Check guides directory
      expect(data['guides'].type).toBe('directory');
      expect(data['guides'].children).toHaveProperty('getting-started.md');
      expect(data['guides'].children).toHaveProperty('advanced.md');

      // Check api directory
      expect(data['api'].type).toBe('directory');
      expect(data['api'].children).toHaveProperty('reference.md');
    }
  });

  it('should parse frontmatter when enabled', async () => {
    const plugin = markdownPlugin({
      directory: 'docs',
      parseFrontmatter: true,
    }) as Plugin;

    await initPlugin(plugin);

    const code = loadModule(plugin, '\0virtual:markdown');
    const match = code?.match(/export default (.+);/s);

    if (match) {
      const data = JSON.parse(match[1]);

      // Check README.md has frontmatter
      expect(data['README.md'].frontmatter).toBeDefined();
      expect(data['README.md'].frontmatter.title).toBe('Welcome');
      expect(data['README.md'].frontmatter.author).toBe('Test Author');
      expect(data['README.md'].frontmatter.published).toBe(true);

      // Check body without frontmatter
      expect(data['README.md'].body).toBeDefined();
      expect(data['README.md'].body).toContain('# Welcome');
      expect(data['README.md'].body).not.toContain('---');

      // Check file without frontmatter
      expect(data['guides'].children['advanced.md'].frontmatter).toBeUndefined();
    }
  });

  it('should not parse frontmatter when disabled', async () => {
    const plugin = markdownPlugin({
      directory: 'docs',
      parseFrontmatter: false,
    }) as Plugin;

    await initPlugin(plugin);

    const code = loadModule(plugin, '\0virtual:markdown');
    const match = code?.match(/export default (.+);/s);

    if (match) {
      const data = JSON.parse(match[1]);

      // Check that frontmatter is not parsed
      expect(data['README.md'].frontmatter).toBeUndefined();
      expect(data['README.md'].body).toBeUndefined();
    }
  });

  it('should generate TypeScript declarations when enabled', async () => {
    const plugin = markdownPlugin({
      directory: 'docs',
      generateTypes: true,
      typesOutputPath: 'types/markdown.d.ts',
    }) as Plugin;

    await initPlugin(plugin);

    // Check that type file was created
    expect(fs.existsSync(typesPath)).toBe(true);

    const typeContent = fs.readFileSync(typesPath, 'utf-8');

    // Check for module declaration
    expect(typeContent).toContain("declare module 'virtual:markdown'");

    // Check for specific file entries
    expect(typeContent).toContain("'README.md'");
    expect(typeContent).toContain("'guides'");
    expect(typeContent).toContain("'api'");
    expect(typeContent).toContain("'getting-started.md'");
  });

  it('should not generate TypeScript declarations when disabled', async () => {
    const plugin = markdownPlugin({
      directory: 'docs',
      generateTypes: false,
      typesOutputPath: 'types/markdown.d.ts',
    }) as Plugin;

    await initPlugin(plugin);

    // Check that type file was not created
    expect(fs.existsSync(typesPath)).toBe(false);
  });

  it('should handle custom virtual module ID', async () => {
    const customId = 'virtual:my-docs';
    const plugin = markdownPlugin({
      directory: 'docs',
      virtualModuleId: customId,
      generateTypes: true,
      typesOutputPath: 'types/markdown.d.ts',
    }) as Plugin;

    await initPlugin(plugin);

    // Check resolveId
    const resolveIdFn = typeof plugin.resolveId === 'function'
      ? plugin.resolveId
      : (plugin.resolveId as any)?.handler;

    const resolved = resolveIdFn?.call({}, customId, undefined, {} as any);
    expect(resolved).toBe(`\0${customId}`);

    // Check type declaration uses custom ID
    const typeContent = fs.readFileSync(typesPath, 'utf-8');
    expect(typeContent).toContain(`declare module '${customId}'`);
  });

  it('should handle empty directory', async () => {
    const emptyDir = path.resolve(testRoot, 'empty');
    if (!fs.existsSync(emptyDir)) {
      fs.mkdirSync(emptyDir, { recursive: true });
    }

    const plugin = markdownPlugin({
      directory: 'empty',
    }) as Plugin;

    await initPlugin(plugin);

    const code = loadModule(plugin, '\0virtual:markdown');
    const match = code?.match(/export default (.+);/s);

    if (match) {
      const data = JSON.parse(match[1]);
      expect(Object.keys(data).length).toBe(0);
    }

    // Clean up
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('should handle non-existent directory', async () => {
    const plugin = markdownPlugin({
      directory: 'non-existent',
    }) as Plugin;

    await initPlugin(plugin);

    const code = loadModule(plugin, '\0virtual:markdown');
    const match = code?.match(/export default (.+);/s);

    if (match) {
      const data = JSON.parse(match[1]);
      expect(Object.keys(data).length).toBe(0);
    }
  });

  it('should only include markdown files', async () => {
    const mixedDir = path.resolve(testRoot, 'mixed');
    fs.mkdirSync(mixedDir, { recursive: true });
    fs.writeFileSync(path.join(mixedDir, 'test.md'), '# Test');
    fs.writeFileSync(path.join(mixedDir, 'test.txt'), 'Not markdown');
    fs.writeFileSync(path.join(mixedDir, 'test.js'), 'console.log("hi")');

    const plugin = markdownPlugin({
      directory: 'mixed',
    }) as Plugin;

    await initPlugin(plugin);

    const code = loadModule(plugin, '\0virtual:markdown');
    const match = code?.match(/export default (.+);/s);

    if (match) {
      const data = JSON.parse(match[1]);
      expect(data).toHaveProperty('test.md');
      expect(data).not.toHaveProperty('test.txt');
      expect(data).not.toHaveProperty('test.js');
    }

    // Clean up
    fs.rmSync(mixedDir, { recursive: true, force: true });
  });
});
