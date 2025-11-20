import * as vscode from 'vscode';
import { TagParser, DirectiveParser } from '../parser/tagParser';
import { TagValidator } from '../parser/validator';
import { ValidationContext } from '../utils/types';

export class DiagnosticsProvider {
	private diagnosticCollection: vscode.DiagnosticCollection;
	private tagParser = new TagParser();
	private directiveParser = new DirectiveParser();
	private validator = new TagValidator();

	constructor() {
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection('gqlschemagen');
	}

	async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
		if (document.languageId !== 'go') {
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [];
		const text = document.getText();

		// Parse tags and directives
		const tags = this.tagParser.parseTags(text);
		const directives = this.directiveParser.parseDirectives(text);

		// Build validation context by scanning for type/input definitions
		const context = this.buildValidationContext(text);

		// Validate tags
		for (const tag of tags) {
			const issues = this.validator.validateTag(tag, context);
			for (const issue of issues) {
				const range = new vscode.Range(
					new vscode.Position(issue.position.line, issue.position.character),
					new vscode.Position(issue.position.line, issue.position.character + (issue.range.end - issue.range.start))
				);

				const severity = issue.severity === 'error' ? vscode.DiagnosticSeverity.Error :
					issue.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
						vscode.DiagnosticSeverity.Information;

				diagnostics.push(new vscode.Diagnostic(range, issue.message, severity));
			}
		}

		// Validate directives
		for (const directive of directives) {
			const issues = this.validator.validateDirective(directive, context);
			for (const issue of issues) {
				const range = new vscode.Range(
					new vscode.Position(issue.position.line, issue.position.character),
					new vscode.Position(issue.position.line, issue.position.character + (issue.range.end - issue.range.start))
				);

				const severity = issue.severity === 'error' ? vscode.DiagnosticSeverity.Error :
					issue.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
						vscode.DiagnosticSeverity.Information;

				diagnostics.push(new vscode.Diagnostic(range, issue.message, severity));
			}
		}

		this.diagnosticCollection.set(document.uri, diagnostics);
	}

	private buildValidationContext(text: string): ValidationContext {
		const context: ValidationContext = {
			types: [],
			inputs: [],
			enums: [],
			ignoreAll: false,
			checkTypeReferences: vscode.workspace.getConfiguration('gqlschemagen.validation').get('checkTypeReferences', true),
			availableTypes: [],
			availableInputs: [],
			availableEnums: []
		};

		// Extract type/input names from @GqlType and @GqlInput directives
		const typeRegex = /@[Gg]qlType\(name:\s*"?([^",)]+)"?\)/g;
		const inputRegex = /@[Gg]qlInput\(name:\s*"?([^",)]+)"?\)/g;
		const enumRegex = /@[Gg]qlEnum\(name:\s*"?([^",)]+)"?\)/g;

		let match;
		while ((match = typeRegex.exec(text)) !== null) {
			context.types.push(match[1]);
			context.availableTypes!.push(match[1]);
		}

		typeRegex.lastIndex = 0;
		while ((match = inputRegex.exec(text)) !== null) {
			context.inputs.push(match[1]);
			context.availableInputs!.push(match[1]);
		}

		inputRegex.lastIndex = 0;
		while ((match = enumRegex.exec(text)) !== null) {
			context.enums.push(match[1]);
			context.availableEnums!.push(match[1]);
		}

		// Check for @GqlIgnoreAll
		if (text.includes('@GqlIgnoreAll') || text.includes('@gqlIgnoreAll')) {
			context.ignoreAll = true;
		}

		return context;
	}

	dispose(): void {
		this.diagnosticCollection.dispose();
	}
}
