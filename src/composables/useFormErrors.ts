import { reactive } from "vue";
import type { AnyObjectSchema, ValidationError } from "yup";

type FieldErrors<K extends string> = Record<K, string[]>;

/**
 * Validates a reactive form against a Yup schema and exposes per-field messages
 * for Vuetify's `:error-messages`.
 */
export function useFormErrors<K extends string>(
  schema: AnyObjectSchema,
  fields: readonly K[]
) {
  const errors = reactive(
    Object.fromEntries(fields.map((f) => [f, [] as string[]])) as FieldErrors<K>
  ) as FieldErrors<K>;

  function clearErrors() {
    for (const f of fields) errors[f] = [];
  }

  function collect(e: ValidationError) {
    const list = e.inner?.length ? e.inner : [e];
    for (const err of list) {
      const path = err.path as K | undefined;
      if (path && path in errors) errors[path].push(err.message);
    }
  }

  async function validateAll(form: object): Promise<boolean> {
    clearErrors();
    try {
      await schema.validate(form, { abortEarly: false });
      return true;
    } catch (e) {
      collect(e as ValidationError);
      return false;
    }
  }

  async function validateField(field: K, form: Record<K, unknown>) {
    errors[field] = [];
    try {
      await schema.validateAt(field, form);
    } catch (e) {
      errors[field] = (e as ValidationError).errors;
    }
  }

  return { errors, clearErrors, validateAll, validateField };
}
