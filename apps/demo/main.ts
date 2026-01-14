import markdownData from 'virtual:markdown';
import type { MarkdownNode, MarkdownFileNode, MarkdownDirectoryNode } from '@quebi/vite-plugin-markdown';

console.log('Markdown data loaded:', markdownData);

// Display the raw structure
document.getElementById('structure')!.textContent = JSON.stringify(markdownData, null, 2);

// Recursively collect all files
function collectFiles(node: Record<string, MarkdownNode>, files: MarkdownFileNode[] = []): MarkdownFileNode[] {
  for (const key of Object.keys(node)) {
    const item = node[key];
    if (item.type === 'file') {
      files.push(item);
    } else if (item.type === 'directory') {
      collectFiles((item as MarkdownDirectoryNode).children, files);
    }
  }
  return files;
}

const files = collectFiles(markdownData as Record<string, MarkdownNode>);

// Render file cards
const filesContainer = document.getElementById('files')!;
filesContainer.innerHTML = files.map(file => {
  const tags = ((file.frontmatter?.tags as string[]) || [])
    .map(tag => `<span class="tag">${tag}</span>`)
    .join('');

  return `
    <div class="file-card">
      <h3>${file.path}</h3>
      ${file.frontmatter ? `
        <div class="frontmatter">
          <strong>Frontmatter:</strong><br/>
          ${Object.entries(file.frontmatter)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join('<br/>')}
        </div>
      ` : ''}
      ${tags ? `<div style="margin: 8px 0">${tags}</div>` : ''}
      ${file.html ? `<div class="content">${file.html}</div>` : ''}
    </div>
  `;
}).join('');
