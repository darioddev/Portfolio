/**
 * Small Zod -> JSON Schema converter covering the constructs used in
 * src/schemas. It exists so the editor schemas can never drift from the
 * Zod schemas that guard the build.
 */
import type { ZodTypeAny } from 'zod';

type Json = Record<string, unknown>;

interface Def {
  typeName: string;
  [key: string]: unknown;
}

const defOf = (schema: ZodTypeAny): Def => (schema as unknown as { _def: Def })._def;

export function toJsonSchema(schema: ZodTypeAny): Json {
  const def = defOf(schema);

  switch (def.typeName) {
    case 'ZodObject': {
      const shape = (def.shape as () => Record<string, ZodTypeAny>)();
      const properties: Record<string, Json> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = toJsonSchema(value);
        const typeName = defOf(value).typeName;
        if (typeName !== 'ZodOptional' && typeName !== 'ZodDefault') required.push(key);
      }
      return {
        type: 'object',
        properties,
        ...(required.length ? { required } : {}),
        ...(def.unknownKeys === 'strict' ? { additionalProperties: false } : {}),
      };
    }
    case 'ZodArray': {
      const min = (def.minLength as { value: number } | null)?.value;
      return { type: 'array', items: toJsonSchema(def.type as ZodTypeAny), ...(min ? { minItems: min } : {}) };
    }
    case 'ZodString': {
      const out: Json = { type: 'string' };
      for (const check of def.checks as { kind: string; value?: unknown; regex?: RegExp }[]) {
        if (check.kind === 'min') out.minLength = check.value;
        if (check.kind === 'url') out.format = 'uri';
        if (check.kind === 'email') out.format = 'email';
        if (check.kind === 'regex' && check.regex) out.pattern = check.regex.source;
      }
      return out;
    }
    case 'ZodEnum':
      return { type: 'string', enum: def.values };
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodNumber':
      return { type: 'number' };
    case 'ZodRecord':
      return { type: 'object', additionalProperties: toJsonSchema(def.valueType as ZodTypeAny) };
    case 'ZodOptional':
      return toJsonSchema(def.innerType as ZodTypeAny);
    case 'ZodNullable':
      return {
        ...toJsonSchema(def.innerType as ZodTypeAny),
        nullable: true,
      };
    case 'ZodDefault':
      return { ...toJsonSchema(def.innerType as ZodTypeAny), default: (def.defaultValue as () => unknown)() };
    case 'ZodEffects':
      return toJsonSchema(def.schema as ZodTypeAny);
    default:
      throw new Error(`json-schema: unsupported Zod type ${def.typeName}`);
  }
}
