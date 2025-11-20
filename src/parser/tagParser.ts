import { GqlTag, GqlDirective } from '../utils/types';

const TAG_REGEX = /`gql:"([^`]+)"`/g;
const DIRECTIVE_REGEX = /@([Gg]ql\w+)(?:\(([^)]*)\))?/g;

export class TagParser {
	parseTags(text: string): GqlTag[] {
		const tags: GqlTag[] = [];
		let match;

		// Reset regex
		TAG_REGEX.lastIndex = 0;

		while ((match = TAG_REGEX.exec(text)) !== null) {
			const rawTag = match[1];
			const startPos = match.index;
			const endPos = startPos + match[0].length;

			// Calculate line and character position
			const beforeMatch = text.substring(0, startPos);
			const lines = beforeMatch.split('\n');
			const line = lines.length - 1;
			const character = lines[lines.length - 1].length;

			const tag: GqlTag = {
				field: '', // Will be populated by context
				rawTag,
				options: this.parseTagOptions(rawTag),
				position: { line, character },
				range: { start: startPos, end: endPos }
			};

			tags.push(tag);
		}

		return tags;
	}

	parseTagOptions(tagContent: string): GqlTag['options'] {
		const options: GqlTag['options'] = {};
		const parts = this.splitTagParts(tagContent);

		// First part might be the field name
		if (parts.length > 0) {
			const firstPart = parts[0].trim();
			if (firstPart && !firstPart.includes(':') && !this.isKnownFlag(firstPart)) {
				options.name = firstPart;
				parts.shift();
			}
		}

		// Parse remaining parts
		for (const part of parts) {
			const trimmed = part.trim();
			if (!trimmed) continue;

			if (trimmed.includes(':')) {
				const [key, ...valueParts] = trimmed.split(':');
				const value = valueParts.join(':').trim();

				switch (key) {
					case 'type':
						options.type = value;
						break;
					case 'description':
						options.description = value.replace(/^["']|["']$/g, '');
						break;
					case 'deprecated':
						options.deprecated = value ? value.replace(/^["']|["']$/g, '') : true;
						break;
					case 'include':
					case 'omit':
					case 'ignore':
					case 'ro':
					case 'wo':
					case 'rw':
						options[key] = this.parseTypeList(value);
						break;
					default:
						// Unknown key:value option - store it so validator can catch it
						options[key] = value;
						break;
				}
			} else {
				// Flag
				switch (trimmed) {
					case 'optional':
						options.optional = true;
						break;
					case 'required':
						options.required = true;
						break;
					case 'deprecated':
						options.deprecated = true;
						break;
					case 'forceResolver':
					case 'force_resolver':
						options.forceResolver = true;
						break;
					case 'include':
						options.include = ['*'];
						break;
					case 'omit':
					case 'ignore':
						options.omit = ['*'];
						options.ignore = ['*'];
						break;
					case 'ro':
						options.ro = ['*'];
						break;
					case 'wo':
						options.wo = ['*'];
						break;
					case 'rw':
						options.rw = ['*'];
						break;
					default:
						// Unknown flag - store it so validator can catch it
						options[trimmed] = true;
						break;
				}
			}
		}

		return options;
	}

	parseTypeList(value: string): string[] {
		if (!value || value === '*') {
			return ['*'];
		}
		
		// Handle single quotes: 'TypeA,TypeB,TypeC'
		if (value.startsWith("'") && value.endsWith("'")) {
			const inner = value.slice(1, -1);
			if (!inner) return ['*'];
			return inner.split(',').map(t => t.trim()).filter(t => t);
		}
		
		// Handle square brackets: [TypeA,TypeB,TypeC]
		if (value.startsWith('[') && value.endsWith(']')) {
			const inner = value.slice(1, -1);
			if (!inner) return ['*'];
			return inner.split(',').map(t => t.trim()).filter(t => t);
		}
		
		// Single value without quotes/brackets
		return [value.trim()];
	}

	splitTagParts(tag: string): string[] {
		const parts: string[] = [];
		let current = '';
		let inQuotes = false;
		let inBrackets = false;

		for (let i = 0; i < tag.length; i++) {
			const char = tag[i];

			if (char === "'" && !inBrackets) {
				inQuotes = !inQuotes;
				current += char;
			} else if (char === '[' && !inQuotes) {
				inBrackets = true;
				current += char;
			} else if (char === ']' && !inQuotes) {
				inBrackets = false;
				current += char;
			} else if (char === ',' && !inQuotes && !inBrackets) {
				// Split on comma only if not inside quotes or brackets
				parts.push(current);
				current = '';
			} else {
				current += char;
			}
		}

		if (current) {
			parts.push(current);
		}

		return parts;
	}

	isListKey(str: string): boolean {
		const match = str.match(/^(include|omit|ignore|ro|wo|rw):/);
		return !!match;
	}

	isKnownFlag(str: string): boolean {
		const flags = ['optional', 'required', 'deprecated', 'forceResolver', 'force_resolver',
			'include', 'omit', 'ignore', 'ro', 'wo', 'rw'];
		return flags.includes(str);
	}
}

export class DirectiveParser {
	parseDirectives(text: string): GqlDirective[] {
		const directives: GqlDirective[] = [];
		let match;

		// Reset regex
		DIRECTIVE_REGEX.lastIndex = 0;

		while ((match = DIRECTIVE_REGEX.exec(text)) !== null) {
			const directiveType = match[1];
			const paramsStr = match[2] || '';
			const startPos = match.index;
			const endPos = startPos + match[0].length;

			// Calculate line and character position
			const beforeMatch = text.substring(0, startPos);
			const lines = beforeMatch.split('\n');
			const line = lines.length - 1;
			const character = lines[lines.length - 1].length;

			const directive: GqlDirective = {
				type: directiveType,
				params: this.parseParams(paramsStr),
				position: { line, character },
				range: { start: startPos, end: endPos }
			};

			directives.push(directive);
		}

		return directives;
	}

	parseParams(paramsStr: string): Record<string, string> {
		const params: Record<string, string> = {};
		if (!paramsStr.trim()) return params;

		// Simple key:value parsing
		const pairs = paramsStr.split(',');
		for (const pair of pairs) {
			const [key, ...valueParts] = pair.split(':');
			if (key && valueParts.length > 0) {
				const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
				params[key.trim()] = value;
			}
		}

		return params;
	}
}
