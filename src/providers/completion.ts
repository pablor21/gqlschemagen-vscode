import * as vscode from 'vscode';
import { TAG_OPTIONS, LIST_KEYS } from '../utils/constants';

export class CompletionProvider implements vscode.CompletionItemProvider {
	provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		const line = document.lineAt(position).text;
		const linePrefix = line.substring(0, position.character);

		// Check if we're typing a directive (@ at start of line in comment)
		const directiveMatch = linePrefix.match(/^\s*(\/\/\s*|\/\*+\s*|\*\s*)@(\w*)$/);
		if (directiveMatch) {
			return this.getDirectiveCompletions();
		}

		// Check if we're inside a gql tag
		const gqlTagMatch = linePrefix.match(/gql:"([^"]*)/);
		if (!gqlTagMatch) {
			return undefined;
		}

		const completions: vscode.CompletionItem[] = [];
		const tagContent = gqlTagMatch[1];

		// Determine what kind of completion to provide
		if (tagContent.endsWith(':')) {
			// Just typed a colon, provide type-specific suggestions
			const key = this.getKeyBeforeColon(tagContent);
			if (key && LIST_KEYS.includes(key as any)) {
				// Suggest type names
				return this.getTypeNameCompletions(document);
			}
		} else if (tagContent.includes(',') || tagContent === '') {
			// Suggest tag options
			return this.getTagOptionCompletions();
		}

		return completions;
	}

	private getKeyBeforeColon(tagContent: string): string | null {
		const parts = tagContent.split(',');
		const lastPart = parts[parts.length - 1].trim();
		const colonIndex = lastPart.lastIndexOf(':');
		if (colonIndex > 0) {
			return lastPart.substring(0, colonIndex);
		}
		return null;
	}

	private getTagOptionCompletions(): vscode.CompletionItem[] {
		const completions: vscode.CompletionItem[] = [];

		for (const option of TAG_OPTIONS) {
			const item = new vscode.CompletionItem(option, vscode.CompletionItemKind.Property);
			item.documentation = this.getDocumentationForOption(option);

			// Add snippet for options that take values
			if (['type', 'description', 'deprecated', 'include', 'omit', 'ignore', 'ro', 'wo', 'rw'].includes(option)) {
				item.insertText = new vscode.SnippetString(`${option}:$1`);
			}

			completions.push(item);
		}

		return completions;
	}

	private getTypeNameCompletions(document: vscode.TextDocument): vscode.CompletionItem[] {
		const completions: vscode.CompletionItem[] = [];
		const text = document.getText();

		// Extract type/input names from the document
		const typeRegex = /@[Gg]qlType\(name:\s*"?([^",)]+)"?\)/g;
		const inputRegex = /@[Gg]qlInput\(name:\s*"?([^",)]+)"?\)/g;

		let match;
		const typeNames = new Set<string>();

		while ((match = typeRegex.exec(text)) !== null) {
			typeNames.add(match[1]);
		}

		typeRegex.lastIndex = 0;
		while ((match = inputRegex.exec(text)) !== null) {
			typeNames.add(match[1]);
		}

		// Add wildcard
		const wildcardItem = new vscode.CompletionItem('*', vscode.CompletionItemKind.Constant);
		wildcardItem.documentation = 'Matches all types';
		completions.push(wildcardItem);

		// Add type names
		for (const typeName of typeNames) {
			const item = new vscode.CompletionItem(typeName, vscode.CompletionItemKind.Class);
			completions.push(item);
		}

		return completions;
	}

	private getDirectiveCompletions(): vscode.CompletionItem[] {
		const completions: vscode.CompletionItem[] = [];

		// @GqlType
		const typeItem = new vscode.CompletionItem('GqlType', vscode.CompletionItemKind.Keyword);
		typeItem.insertText = new vscode.SnippetString('GqlType${1:(name:"${2:TypeName}")}');
		typeItem.documentation = new vscode.MarkdownString('Define a GraphQL type. The `name` parameter is optional - if omitted, uses the struct name.');
		completions.push(typeItem);

		// @GqlInput
		const inputItem = new vscode.CompletionItem('GqlInput', vscode.CompletionItemKind.Keyword);
		inputItem.insertText = new vscode.SnippetString('GqlInput${1:(name:"${2:InputName}")}');
		inputItem.documentation = new vscode.MarkdownString('Define a GraphQL input type. The `name` parameter is optional - if omitted, uses the struct name with "Input" suffix.');
		completions.push(inputItem);

		// @GqlEnum
		const enumItem = new vscode.CompletionItem('GqlEnum', vscode.CompletionItemKind.Keyword);
		enumItem.insertText = new vscode.SnippetString('GqlEnum${1:(name:"${2:EnumName}")}');
		enumItem.documentation = new vscode.MarkdownString('Define a GraphQL enum. The `name` parameter is optional - if omitted, uses the type name.');
		completions.push(enumItem);

		// @GqlNamespace
		const namespaceItem = new vscode.CompletionItem('GqlNamespace', vscode.CompletionItemKind.Keyword);
		namespaceItem.insertText = new vscode.SnippetString('GqlNamespace(name:"${1:NamespaceName}")');
		namespaceItem.documentation = new vscode.MarkdownString('Group types under a namespace. The `name` parameter is **required**.');
		completions.push(namespaceItem);

		// @GqlIgnore
		const ignoreItem = new vscode.CompletionItem('GqlIgnore', vscode.CompletionItemKind.Keyword);
		ignoreItem.documentation = new vscode.MarkdownString('Ignore this struct - do not generate GraphQL schema for it.');
		completions.push(ignoreItem);

		// @GqlIgnoreAll
		const ignoreAllItem = new vscode.CompletionItem('GqlIgnoreAll', vscode.CompletionItemKind.Keyword);
		ignoreAllItem.documentation = new vscode.MarkdownString('Ignore all structs in this file.');
		completions.push(ignoreAllItem);

		return completions;
	}

	private getDocumentationForOption(option: string): vscode.MarkdownString {
		const docs: Record<string, string> = {
			'type': 'Override the GraphQL type',
			'description': 'Add a description to the field',
			'deprecated': 'Mark field as deprecated with optional reason',
			'optional': 'Mark field as optional (nullable)',
			'required': 'Mark field as required (non-null)',
			'forceResolver': 'Force generation of a resolver',
			'include': 'Include field only in specified types (comma-separated list)',
			'omit': 'Omit field from specified types (comma-separated list)',
			'ignore': 'Alias for omit - exclude field from specified types',
			'ro': 'Read-only - include only in types (not inputs)',
			'wo': 'Write-only - include only in inputs (not types)',
			'rw': 'Read-write - include in both types and inputs'
		};

		const markdown = new vscode.MarkdownString();
		markdown.appendMarkdown(docs[option] || 'GQL tag option');
		markdown.isTrusted = true;
		return markdown;
	}
}
