import type { Plugin } from 'vite';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface MarkdownPluginOptions {
  /**
   * Directory containing markdown files to compile
   * @default 'docs'
   */
  directory?: string;

  /**
   * Virtual module ID to expose the compiled JSON
   * @default 'virtual:markdown'
   */
  virtualModuleId?: string;

  /**
   * Include patterns for markdown files
   * @default ["**\/*.md", "**\/*.markdown"]
   */
  include?: string | string[];

  /**
   * Exclude patterns for markdown files
   * @default [""]
   */
  exclude?: string | string[];

  /**
   * Extract frontmatter from markdown files
   * @default true
   */
  parseFrontmatter?: boolean;

  /**
   * Parse markdown to HTML
   * @default false
   */
  parseMarkdown?: boolean;

  /**
   * Generate TypeScript declaration file for the virtual module
   * @default true
   */
  generateTypes?: boolean;

  /**
   * Output path for the generated type declaration file
   * @default 'types/markdown.d.ts'
   */
  typesOutputPath?: string;
}

/**
 * Markdown file node
 */
export interface MarkdownFileNode {
  type: 'file';
  name: string;
  path: string;
  content: string;
  frontmatter?: Record<string, any>;
  body?: string;
  html?: string;
}

/**
 * Markdown directory node
 */
export interface MarkdownDirectoryNode {
  type: 'directory';
  name: string;
  path: string;
  children: Record<string, MarkdownNode>;
}

/**
 * Markdown node (discriminated union)
 */
export type MarkdownNode = MarkdownFileNode | MarkdownDirectoryNode;

// No longer need custom parseFrontmatter - using gray-matter

/**
 * Recursively scan directory and build nested structure
 */
async function scanDirectory(
  dirPath: string,
  rootPath: string,
  shouldParseFrontmatter: boolean,
  shouldParseMarkdown: boolean
): Promise<Record<string, MarkdownNode>> {
  const result: Record<string, MarkdownNode> = {};

  try {
    await fs.stat(dirPath);
  } catch {
    return result;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    if (entry.isDirectory()) {
      const children = await scanDirectory(fullPath, rootPath, shouldParseFrontmatter, shouldParseMarkdown);

      // Only include directory if it has children
      if (Object.keys(children).length > 0) {
        result[entry.name] = {
          type: 'directory',
          name: entry.name,
          path: relativePath,
          children,
        };
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ext === '.md' || ext === '.markdown') {
        const rawContent = await fs.readFile(fullPath, 'utf-8');
        const name = path.basename(entry.name, ext);

        const fileNode: MarkdownFileNode = {
          type: 'file',
          name,
          path: relativePath,
          content: rawContent,
        };

        if (shouldParseFrontmatter) {
          // Use gray-matter to parse frontmatter
          const parsed = matter(rawContent);

          if (Object.keys(parsed.data).length > 0) {
            fileNode.frontmatter = parsed.data;
          }
          fileNode.body = parsed.content;

          // Parse markdown to HTML if enabled
          if (shouldParseMarkdown) {
            fileNode.html = await marked(parsed.content) as string;
          }
        } else if (shouldParseMarkdown) {
           // Parse markdown without frontmatter extraction
          fileNode.html = await marked(rawContent) as string;
        }

        result[entry.name] = fileNode;
      }
    }
  }

  return result;
}

/**
 * Generate TypeScript declaration for the markdown data structure
 */
function generateTypeDeclaration(
  data: Record<string, MarkdownNode>,
  virtualModuleId: string,
  parseFrontmatter: boolean,
  parseMarkdown: boolean
): string {
  /**
   * Infer TypeScript type from a JavaScript value
   */
  function inferType(value: any): string {
    if (value === null || value === undefined) return 'any';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'any[]';
      const elementTypes = [...new Set(value.map(inferType))];
      if (elementTypes.length === 1) return `${elementTypes[0]}[]`;
      return `(${elementTypes.join(' | ')})[]`;
    }
    if (typeof value === 'object') {
      const fields = Object.entries(value)
        .map(([k, v]) => `${k}: ${inferType(v)}`)
        .join('; ');
      return `{ ${fields} }`;
    }
    return 'any';
  }

  /**
   * Generate frontmatter type from actual data
   */
  function generateFrontmatterType(frontmatter: Record<string, any>): string {
    const fields = Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${inferType(value)}`)
      .join('; ');

    return `{ ${fields} }`;
  }

  function generateNodeType(node: MarkdownNode, depth: number = 0): string {
    const indent = '  '.repeat(depth);

    if (node.type === 'file') {
      const fields = [
        `${indent}  type: 'file';`,
        `${indent}  name: '${node.name}';`,
        `${indent}  path: '${node.path}';`,
        `${indent}  content: string;`,
      ];

      if (parseFrontmatter) {
        const frontmatterType = node.frontmatter
          ? generateFrontmatterType(node.frontmatter)
          : 'Record<string, never>';
        fields.push(`${indent}  frontmatter: ${frontmatterType};`);
        fields.push(`${indent}  body: string;`);
      }

      if (parseMarkdown) {
        fields.push(`${indent}  html: string;`);
      }

      return `{
${fields.join('\n')}
${indent}}`;
    } else {
      const childrenType = node.children
        ? Object.entries(node.children)
            .map(([key, child]) => `${indent}  '${key}': ${generateNodeType(child, depth + 1)}`)
            .join(';\n')
        : '';

      return `{
${indent}  type: 'directory';
${indent}  name: '${node.name}';
${indent}  path: '${node.path}';
${indent}  children: {
${childrenType}
${indent}  };
${indent}}`;
    }
  }

  const entries = Object.entries(data)
    .map(([key, node]) => `  '${key}': ${generateNodeType(node, 1)}`)
    .join(';\n');

  return `declare module '${virtualModuleId}' {
  const markdownData: {
${entries}
  };

  export default markdownData;
}
`;
}

/**
 * Vite plugin to compile markdown files into a virtual module
 */
export default function markdownPlugin(options: MarkdownPluginOptions = {}): Plugin {
  const {
    directory = 'docs',
    virtualModuleId = 'virtual:markdown',
    parseFrontmatter = true,
    parseMarkdown = false,
    generateTypes = true,
    typesOutputPath = 'types/markdown.d.ts',
  } = options;

  const resolvedVirtualModuleId = `\0${virtualModuleId}`;
  let rootDir: string;
  let markdownDir: string;
  let markdownData: Record<string, MarkdownNode>;

  const watchedFiles = new Set<string>();

  /**
   * Collect all markdown files for watching
   */
  async function collectMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      await fs.stat(dir);
    } catch {
      return files;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...await collectMarkdownFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (ext === '.md' || ext === '.markdown') {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Build the markdown data structure
   */
  async function buildMarkdownData() {
    markdownData = await scanDirectory(markdownDir, markdownDir, parseFrontmatter, parseMarkdown);

    // Update watched files
    watchedFiles.clear();
    const files = await collectMarkdownFiles(markdownDir);
    for (const file of files) {
      watchedFiles.add(file);
    }

    // Generate TypeScript declaration if enabled
    if (generateTypes && rootDir) {
      const typeDeclaration = generateTypeDeclaration(markdownData, virtualModuleId, parseFrontmatter, parseMarkdown);
      const typesPath = path.resolve(rootDir, typesOutputPath);
      const typesDir = path.dirname(typesPath);

      // Create types directory if it doesn't exist
      try {
        await fs.stat(typesDir);
      } catch {
        await fs.mkdir(typesDir, { recursive: true });
      }

      // Write the type declaration file
      await fs.writeFile(typesPath, typeDeclaration, 'utf-8');
    }
  }

  return {
    name: 'vite-plugin-markdown',

    // Enforce this plugin to run before other plugins (especially TypeScript)
    // This ensures the type declarations are generated before TS checks them
    enforce: 'pre',

    configResolved(config) {
      rootDir = config.root;
      markdownDir = path.resolve(rootDir, directory);
    },

    async buildStart() {
      await buildMarkdownData();

      // Add markdown files to watch list
      for (const file of watchedFiles) {
        this.addWatchFile(file);
      }
    },

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export default ${JSON.stringify(markdownData, null, 2)};`;
      }
    },

    async handleHotUpdate({ file, server }) {
      // Check if the changed file is a markdown file we're watching
      if (watchedFiles.has(file)) {
        // Rebuild the markdown data
        await buildMarkdownData();

        // Invalidate the virtual module
        const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
        if (module) {
          server.moduleGraph.invalidateModule(module);
        }

        // Trigger HMR
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
  };
}

export { markdownPlugin };
