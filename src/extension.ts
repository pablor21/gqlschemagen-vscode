import * as vscode from 'vscode';
import { DiagnosticsProvider } from './providers/diagnostics';
import { CompletionProvider } from './providers/completion';
import { HoverProvider } from './providers/hover';
import { CodeActionProvider } from './providers/codeAction';

export function activate(context: vscode.ExtensionContext) {
	console.log('GQL Schema Gen extension is now active');
	vscode.window.showInformationMessage('GQL Schema Gen extension activated!');

	const diagnosticsProvider = new DiagnosticsProvider();

	// Register diagnostics
	context.subscriptions.push(diagnosticsProvider);

	// Trigger diagnostics on document changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.languageId === 'go') {
				diagnosticsProvider.provideDiagnostics(e.document);
			}
		})
	);

	// Trigger diagnostics on document open
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(document => {
			if (document.languageId === 'go') {
				diagnosticsProvider.provideDiagnostics(document);
			}
		})
	);

	// Register completion provider
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			'go',
			new CompletionProvider(),
			'"', ',', ':', '@'
		)
	);

	// Register hover provider
	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			'go',
			new HoverProvider()
		)
	);

	// Register code action provider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			'go',
			new CodeActionProvider()
		)
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('gqlschemagen.validateTags', () => {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === 'go') {
				diagnosticsProvider.provideDiagnostics(editor.document);
				vscode.window.showInformationMessage('GQL tags validated');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gqlschemagen.showSchema', () => {
			vscode.window.showInformationMessage('Schema preview coming soon!');
		})
	);

	// Validate all open Go documents
	vscode.workspace.textDocuments.forEach(document => {
		if (document.languageId === 'go') {
			diagnosticsProvider.provideDiagnostics(document);
		}
	});
}

export function deactivate() {}

