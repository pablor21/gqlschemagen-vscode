import * as vscode from 'vscode';
import { TagParser, DirectiveParser } from '../parser/tagParser';

export class HoverProvider implements vscode.HoverProvider {
	private tagParser = new TagParser();
	private directiveParser = new DirectiveParser();

	provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.Hover> {
		const text = document.getText();
		const offset = document.offsetAt(position);

		// Check if hovering over a tag
		const tags = this.tagParser.parseTags(text);
		for (const tag of tags) {
			if (offset >= tag.range.start && offset <= tag.range.end) {
				return this.getTagHover(tag);
			}
		}

		// Check if hovering over a directive
		const directives = this.directiveParser.parseDirectives(text);
		for (const directive of directives) {
			if (offset >= directive.range.start && offset <= directive.range.end) {
				return this.getDirectiveHover(directive, document);
			}
		}

		return undefined;
	}

	private getTagHover(tag: any): vscode.Hover {
		const markdown = new vscode.MarkdownString();
		markdown.appendMarkdown('**GQL Struct Tag**\n\n');
		markdown.appendCodeblock(tag.rawTag, 'go');
		markdown.appendMarkdown('\n\n**Parsed Options:**\n\n');

		for (const [key, value] of Object.entries(tag.options)) {
			if (value === true) {
				markdown.appendMarkdown(`- \`${key}\`: enabled\n`);
			} else if (Array.isArray(value)) {
				markdown.appendMarkdown(`- \`${key}\`: ${value.join(', ')}\n`);
			} else {
				markdown.appendMarkdown(`- \`${key}\`: ${value}\n`);
			}
		}

		markdown.appendMarkdown('\n\n**Available Options:**\n\n');
		markdown.appendMarkdown('- `type`: Override GraphQL type\n');
		markdown.appendMarkdown('- `description`: Field description\n');
		markdown.appendMarkdown('- `deprecated`: Mark as deprecated\n');
		markdown.appendMarkdown('- `optional`: Mark as nullable\n');
		markdown.appendMarkdown('- `required`: Mark as non-null\n');
		markdown.appendMarkdown('- `include`: Include only in specific types\n');
		markdown.appendMarkdown('- `omit/ignore`: Exclude from specific types\n');
		markdown.appendMarkdown('- `ro`: Read-only (types only)\n');
		markdown.appendMarkdown('- `wo`: Write-only (inputs only)\n');
		markdown.appendMarkdown('- `rw`: Read-write (both)\n');

		markdown.isTrusted = true;
		return new vscode.Hover(markdown);
	}

	private getDirectiveHover(directive: any, document: vscode.TextDocument): vscode.Hover {
		const markdown = new vscode.MarkdownString();
		markdown.appendMarkdown(`**@${directive.type}**\n\n`);

		const descriptions: Record<string, string> = {
			'gqlType': 'Define a GraphQL type',
			'GqlType': 'Define a GraphQL type',
			'gqlInput': 'Define a GraphQL input type',
			'GqlInput': 'Define a GraphQL input type',
			'gqlEnum': 'Define a GraphQL enum',
			'GqlEnum': 'Define a GraphQL enum',
			'gqlNamespace': 'Group types under a namespace',
			'GqlNamespace': 'Group types under a namespace',
			'gqlIgnore': 'Ignore this struct',
			'GqlIgnore': 'Ignore this struct',
			'gqlIgnoreAll': 'Ignore all structs in file',
			'GqlIgnoreAll': 'Ignore all structs in file'
		};

		markdown.appendMarkdown(descriptions[directive.type] || 'GraphQL directive\n\n');

		// If no explicit name parameter, try to infer it from the struct
		const params = { ...directive.params };
		if (!params.name && this.isTypeGeneratingDirective(directive.type)) {
			const structName = this.findStructNameAfterDirective(directive, document);
			if (structName) {
				if (directive.type.toLowerCase() === 'gqlinput') {
					params.name = structName + 'Input';
				} else {
					params.name = structName;
				}
			}
		}

		if (Object.keys(params).length > 0) {
			markdown.appendMarkdown('\n\n**Parameters:**\n\n');
			for (const [key, value] of Object.entries(params)) {
				markdown.appendMarkdown(`- \`${key}\`: ${value}\n`);
			}
		}

		markdown.isTrusted = true;
		return new vscode.Hover(markdown);
	}

	private isTypeGeneratingDirective(directiveType: string): boolean {
		const normalized = directiveType.toLowerCase();
		return normalized === 'gqltype' || normalized === 'gqlinput' || normalized === 'gqlenum';
	}

	private findStructNameAfterDirective(directive: any, document: vscode.TextDocument): string | undefined {
		const text = document.getText();
		const lines = text.split('\n');
		const directiveLine = directive.position.line;

		// Look forward from directive to find struct definition
		for (let i = directiveLine; i < Math.min(lines.length, directiveLine + 10); i++) {
			const line = lines[i];
			const structMatch = line.match(/type\s+(\w+)\s+struct/);
			if (structMatch) {
				return structMatch[1];
			}
		}

		return undefined;
	}
}
