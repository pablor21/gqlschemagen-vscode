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
		const lines = text.split('\n');

		// Parse tags and directives
		const tags = this.tagParser.parseTags(text);
		const directives = this.directiveParser.parseDirectives(text);

		// Build validation context by scanning for type/input definitions
		const context = this.buildValidationContext(text);
		
		// Build struct-specific type mappings
		const structTypeMap = this.buildStructTypeMapping(lines);

		// Validate tags with struct-specific context
		for (const tag of tags) {
			// Find which struct this tag belongs to
			const structTypes = this.findStructTypesForTag(tag, lines, structTypeMap);
			
			// Create a context with only the types available for this struct
			// If no struct-specific types found, use the global context
			const tagContext = (structTypes.types.length > 0 || structTypes.inputs.length > 0) ? {
				...context,
				availableTypes: structTypes.types,
				availableInputs: structTypes.inputs
			} : context;
			
			const issues = this.validator.validateTag(tag, tagContext);
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

	private buildStructTypeMapping(lines: string[]): Map<string, { types: string[], inputs: string[] }> {
		const structMap = new Map<string, { types: string[], inputs: string[] }>();
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			
			// Find struct definition
			const structMatch = line.match(/type\s+(\w+)\s+struct/);
			if (structMatch) {
				const structName = structMatch[1];
				const types: string[] = [];
				const inputs: string[] = [];
				
				// Look backwards for directives
				for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
					const prevLine = lines[j].trim();
					
					// Stop at empty line or non-comment
					if (!prevLine || (!prevLine.startsWith('//') && !prevLine.startsWith('/*'))) {
						if (j < i - 1) break;
					}
					
					// Check for @GqlType
					const typeMatch = prevLine.match(/@[Gg]qlType(?:\((?:name:\s*"?([^",)]+)"?)?\))?/);
					if (typeMatch) {
						const typeName = typeMatch[1] || structName;
						types.push(typeName);
					}
					
					// Check for @GqlInput
					const inputMatch = prevLine.match(/@[Gg]qlInput(?:\((?:name:\s*"?([^",)]+)"?)?\))?/);
					if (inputMatch) {
						const inputName = inputMatch[1] || (structName + 'Input');
						inputs.push(inputName);
					}
				}
				
				structMap.set(structName, { types, inputs });
			}
		}
		
		return structMap;
	}

	private findStructTypesForTag(tag: any, lines: string[], structMap: Map<string, { types: string[], inputs: string[] }>): { types: string[], inputs: string[] } {
		// Find which struct this tag belongs to by looking at the line number
		const tagLine = tag.position.line;
		
		// Look forward from tag to find the struct
		for (let i = tagLine; i < Math.min(lines.length, tagLine + 20); i++) {
			const line = lines[i];
			const structMatch = line.match(/(\w+)\s+string|(\w+)\s+int|(\w+)\s+\w+\s+`/);
			
			if (structMatch) {
				// We're inside a struct, now find which struct by looking backwards
				for (let j = i; j >= 0; j--) {
					const prevLine = lines[j];
					const structDefMatch = prevLine.match(/type\s+(\w+)\s+struct/);
					if (structDefMatch) {
						const structName = structDefMatch[1];
						const mapping = structMap.get(structName);
						if (mapping) {
							return mapping;
						}
						break;
					}
				}
			}
		}
		
		// Fallback: return empty arrays
		return { types: [], inputs: [] };
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

		// Parse all directives first to handle them properly
		const lines = text.split('\n');
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			
			// Check for @GqlType
			const typeMatch = line.match(/@[Gg]qlType(?:\((?:name:\s*"?([^",)]+)"?)?\))?/);
			if (typeMatch) {
				const explicitName = typeMatch[1];
				if (explicitName) {
					// Has explicit name
					context.types.push(explicitName);
					context.availableTypes!.push(explicitName);
				} else {
					// Find the struct name on the next non-comment line
					// @GqlType without name uses the struct name as-is
					for (let j = i + 1; j < lines.length; j++) {
						const nextLine = lines[j].trim();
						if (nextLine.startsWith('//')) continue;
						const structMatch = nextLine.match(/type\s+(\w+)/);
						if (structMatch) {
							context.types.push(structMatch[1]);
							context.availableTypes!.push(structMatch[1]);
							break;
						}
					}
				}
			}
			
			// Check for @GqlInput
			const inputMatch = line.match(/@[Gg]qlInput(?:\((?:name:\s*"?([^",)]+)"?)?\))?/);
			if (inputMatch) {
				const explicitName = inputMatch[1];
				if (explicitName) {
					// Has explicit name
					context.inputs.push(explicitName);
					context.availableInputs!.push(explicitName);
				} else {
					// Find the struct name on the next non-comment line
					// @GqlInput without name uses struct name + "Input" suffix
					for (let j = i + 1; j < lines.length; j++) {
						const nextLine = lines[j].trim();
						if (nextLine.startsWith('//')) continue;
						const structMatch = nextLine.match(/type\s+(\w+)/);
						if (structMatch) {
							const inputName = structMatch[1] + 'Input';
							context.inputs.push(inputName);
							context.availableInputs!.push(inputName);
							break;
						}
					}
				}
			}
			
			// Check for @GqlEnum
			const enumMatch = line.match(/@[Gg]qlEnum(?:\((?:name:\s*"?([^",)]+)"?)?\))?/);
			if (enumMatch) {
				const explicitName = enumMatch[1];
				if (explicitName) {
					// Has explicit name
					context.enums.push(explicitName);
					context.availableEnums!.push(explicitName);
				} else {
					// Find the type name on the next non-comment line
					// @GqlEnum without name uses the type name as-is
					for (let j = i + 1; j < lines.length; j++) {
						const nextLine = lines[j].trim();
						if (nextLine.startsWith('//')) continue;
						const typeMatch = nextLine.match(/type\s+(\w+)/);
						if (typeMatch) {
							context.enums.push(typeMatch[1]);
							context.availableEnums!.push(typeMatch[1]);
							break;
						}
					}
				}
			}
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
