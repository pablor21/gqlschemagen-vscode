export interface GqlTag {
	field: string;
	rawTag: string;
	options: TagOptions;
	position: { line: number; character: number };
	range: { start: number; end: number };
}

export interface TagOptions {
	name?: string;
	type?: string;
	include?: string[];
	omit?: string[];
	ignore?: string[];
	ro?: string[];
	wo?: string[];
	rw?: string[];
	optional?: boolean;
	required?: boolean;
	deprecated?: boolean | string;
	description?: string;
	forceResolver?: boolean;
	[key: string]: any; // Allow unknown options for validation
}

export interface GqlDirective {
	type: string;
	params: Record<string, string>;
	position: { line: number; character: number };
	range: { start: number; end: number };
}

export interface ValidationContext {
	types: string[];
	inputs: string[];
	enums: string[];
	ignoreAll: boolean;
	checkTypeReferences?: boolean;
	availableTypes?: string[];
	availableInputs?: string[];
	availableEnums?: string[];
}

export interface ValidationIssue {
	message: string;
	severity: 'error' | 'warning' | 'info';
	range: { start: number; end: number };
	position: { line: number; character: number };
}
