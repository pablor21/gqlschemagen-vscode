import * as vscode from 'vscode';
import { TagParser } from '../parser/tagParser';

export class CodeActionProvider implements vscode.CodeActionProvider {
	private tagParser = new TagParser();

	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
		const actions: vscode.CodeAction[] = [];

		// Provide quick fixes for diagnostics
		for (const diagnostic of context.diagnostics) {
			if (diagnostic.message.includes('Cannot have both "optional" and "required"')) {
				actions.push(this.createRemoveOptionalAction(document, diagnostic));
				actions.push(this.createRemoveRequiredAction(document, diagnostic));
			}

			if (diagnostic.message.includes('Cannot have multiple access modifiers')) {
				actions.push(this.createRemoveAccessModifiersAction(document, diagnostic));
			}

			if (diagnostic.message.includes('Unknown tag option')) {
				actions.push(this.createRemoveUnknownOptionAction(document, diagnostic));
			}
		}

		return actions;
	}

	private createRemoveOptionalAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Remove "optional" flag', vscode.CodeActionKind.QuickFix);
		action.diagnostics = [diagnostic];
		action.edit = new vscode.WorkspaceEdit();

		const tagContent = document.getText(diagnostic.range);
		const newContent = tagContent.replace(/,?\s*optional\s*,?/g, ',').replace(/,,/g, ',').replace(/^,|,$/g, '');
		action.edit.replace(document.uri, diagnostic.range, newContent);

		return action;
	}

	private createRemoveRequiredAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Remove "required" flag', vscode.CodeActionKind.QuickFix);
		action.diagnostics = [diagnostic];
		action.edit = new vscode.WorkspaceEdit();

		const tagContent = document.getText(diagnostic.range);
		const newContent = tagContent.replace(/,?\s*required\s*,?/g, ',').replace(/,,/g, ',').replace(/^,|,$/g, '');
		action.edit.replace(document.uri, diagnostic.range, newContent);

		return action;
	}

	private createRemoveIncludeAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Remove "include" list', vscode.CodeActionKind.QuickFix);
		action.diagnostics = [diagnostic];
		action.edit = new vscode.WorkspaceEdit();

		const tagContent = document.getText(diagnostic.range);
		const newContent = tagContent.replace(/,?\s*include:[^,]+\s*,?/g, ',').replace(/,,/g, ',').replace(/^,|,$/g, '');
		action.edit.replace(document.uri, diagnostic.range, newContent);

		return action;
	}

	private createRemoveOmitAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Remove "omit/ignore" lists', vscode.CodeActionKind.QuickFix);
		action.diagnostics = [diagnostic];
		action.edit = new vscode.WorkspaceEdit();

		const tagContent = document.getText(diagnostic.range);
		let newContent = tagContent.replace(/,?\s*omit:[^,]+\s*,?/g, ',');
		newContent = newContent.replace(/,?\s*ignore:[^,]+\s*,?/g, ',');
		newContent = newContent.replace(/,,/g, ',').replace(/^,|,$/g, '');
		action.edit.replace(document.uri, diagnostic.range, newContent);

		return action;
	}

	private createRemoveAccessModifiersAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Remove access modifiers', vscode.CodeActionKind.QuickFix);
		action.diagnostics = [diagnostic];
		action.edit = new vscode.WorkspaceEdit();

		const tagContent = document.getText(diagnostic.range);
		let newContent = tagContent.replace(/,?\s*ro:[^,]*\s*,?/g, ',');
		newContent = newContent.replace(/,?\s*wo:[^,]*\s*,?/g, ',');
		newContent = newContent.replace(/,?\s*rw:[^,]*\s*,?/g, ',');
		newContent = newContent.replace(/,?\s*ro\s*,?/g, ',');
		newContent = newContent.replace(/,?\s*wo\s*,?/g, ',');
		newContent = newContent.replace(/,?\s*rw\s*,?/g, ',');
		newContent = newContent.replace(/,,/g, ',').replace(/^,|,$/g, '');
		action.edit.replace(document.uri, diagnostic.range, newContent);

		return action;
	}

	private createRemoveUnknownOptionAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const match = diagnostic.message.match(/Unknown tag option: (\w+)/);
		if (!match) return new vscode.CodeAction('Remove unknown option', vscode.CodeActionKind.QuickFix);

		const unknownOption = match[1];
		const action = new vscode.CodeAction(`Remove unknown option "${unknownOption}"`, vscode.CodeActionKind.QuickFix);
		action.diagnostics = [diagnostic];
		action.edit = new vscode.WorkspaceEdit();

		const tagContent = document.getText(diagnostic.range);
		const regex = new RegExp(`,?\\s*${unknownOption}(?::[^,]+)?\\s*,?`, 'g');
		const newContent = tagContent.replace(regex, ',').replace(/,,/g, ',').replace(/^,|,$/g, '');
		action.edit.replace(document.uri, diagnostic.range, newContent);

		return action;
	}
}
