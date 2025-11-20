// Tag option keys that expect type lists
export const LIST_KEYS = ['include', 'omit', 'ignore', 'ro', 'wo', 'rw'] as const;

// All valid tag options
export const TAG_OPTIONS = [
	'name', // Field name (first parameter)
	...LIST_KEYS,
	'type',
	'description',
	'deprecated',
	'optional',
	'required',
	'forceResolver',
	'force_resolver',
] as const;

// Directive types
export const DIRECTIVE_TYPES = [
	'GqlType',
	'GqlInput',
	'GqlEnum',
	'GqlEnumValue',
	'GqlNamespace',
	'GqlIgnoreAll',
	'GqlUseModelDirective',
	'GqlTypeExtraField',
	'GqlInputExtraField',
	// Lowercase variants
	'gqlType',
	'gqlInput',
	'gqlEnum',
	'gqlEnumValue',
	'gqlNamespace',
	'gqlIgnoreAll',
	'gqlUseModelDirective',
	'gqlTypeExtraField',
	'gqlInputExtraField',
] as const;

export type TagOption = typeof TAG_OPTIONS[number];
export type DirectiveType = typeof DIRECTIVE_TYPES[number];
