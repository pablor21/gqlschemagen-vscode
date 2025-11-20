import { GqlTag, GqlDirective, ValidationContext, ValidationIssue } from '../utils/types';
import { TAG_OPTIONS, DIRECTIVE_TYPES, LIST_KEYS } from '../utils/constants';

export class TagValidator {
	validateTag(tag: GqlTag, context?: ValidationContext): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Check for unknown options
		const options = tag.options;
		const knownKeys = TAG_OPTIONS;

		for (const key in options) {
			if (!knownKeys.includes(key as any)) {
				issues.push({
					message: `Unknown tag option: ${key}`,
					severity: 'warning',
					range: tag.range,
					position: tag.position
				});
			}
		}

		// Check for conflicting options
		if (options.optional && options.required) {
			issues.push({
				message: 'Cannot have both "optional" and "required" flags',
				severity: 'error',
				range: tag.range,
				position: tag.position
			});
		}

		// Check for conflicting access modifiers
		const accessModifiers = [options.ro, options.wo, options.rw].filter(x => x);
		if (accessModifiers.length > 1) {
			issues.push({
				message: 'Cannot have multiple access modifiers (ro/wo/rw)',
				severity: 'error',
				range: tag.range,
				position: tag.position
			});
		}

		// Validate type references if context provided
		if (context?.checkTypeReferences) {
			this.validateTypeReferences(tag, context, issues);
		}

		return issues;
	}

	validateTypeReferences(tag: GqlTag, context: ValidationContext, issues: ValidationIssue[]): void {
		const typeListKeys = ['include', 'omit', 'ignore', 'ro', 'wo', 'rw'] as const;

		for (const key of typeListKeys) {
			const list = tag.options[key];
			if (!list || list.includes('*')) continue;

			for (const typeName of list) {
				const exists = context.availableTypes?.includes(typeName) ||
					context.availableInputs?.includes(typeName);

				if (!exists) {
					issues.push({
						message: `Type "${typeName}" not found. Available types/inputs: ${[...(context.availableTypes || []), ...(context.availableInputs || [])].join(', ')}`,
						severity: 'warning',
						range: tag.range,
						position: tag.position
					});
				}
			}
		}
	}

	validateDirective(directive: GqlDirective, context?: ValidationContext): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Check for unknown directive types
		const normalizedType = directive.type.toLowerCase();
		const isKnown = DIRECTIVE_TYPES.some(dt => dt.toLowerCase() === normalizedType);

		if (!isKnown) {
			issues.push({
				message: `Unknown directive type: @${directive.type}. Known directives: ${DIRECTIVE_TYPES.join(', ')}`,
				severity: 'warning',
				range: directive.range,
				position: directive.position
			});
		}

		// Type-specific validation
		switch (normalizedType) {
			case 'gqlnamespace':
				// Only GqlNamespace requires the name parameter
				if (!directive.params.name) {
					issues.push({
						message: '@GqlNamespace directive requires a "name" parameter',
						severity: 'error',
						range: directive.range,
						position: directive.position
					});
				}
				break;
			
			// GqlType, GqlInput, GqlEnum have optional name parameter (defaults to struct name)
			case 'gqltype':
			case 'gqlinput':
			case 'gqlenum':
				// name parameter is optional - if omitted, uses struct name
				break;
		}

		return issues;
	}

	validateTagAndDirectiveCombination(tag: GqlTag | undefined, directive: GqlDirective | undefined): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Can add cross-validation logic here
		// For example: if directive says @GqlType but tag has conflicting info

		return issues;
	}
}
