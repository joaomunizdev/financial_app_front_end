import * as yup from 'yup';

export const purchaseSchema = yup.object({
  creditCardId: yup.string().required('O cartão é obrigatório.'),
  tenantId: yup.string().required('O responsável é obrigatório.'),
  description: yup.string().trim().required('A descrição é obrigatória.').max(255, 'Máximo de 255 caracteres.'),

  totalAmount: yup.number()
    .transform(value => (isNaN(value) ? undefined : value))
    .required('O valor é obrigatório.')
    .positive('O valor deve ser positivo.')
    .max(9_999_999_999.99, 'Valor muito alto.')
    .typeError('O valor deve ser um número.'),

  // Kept as "YYYY-MM-DD": casting to Date would apply a timezone and could shift the day.
  purchaseDate: yup.string()
    .required('A data é obrigatória.')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido.'),

  isInstallment: yup.boolean(),

  installmentsTotal: yup.number().when('isInstallment', {
    is: true,
    then: schema => schema
      .required('O total de parcelas é obrigatório.')
      .min(2, 'Deve haver pelo menos 2 parcelas.')
      .integer()
      .typeError('Deve ser um número.'),
    otherwise: schema => schema.nullable(),
  }),

  installmentsPaid: yup.number().when('isInstallment', {
    is: true,
    then: schema => schema
      .required('O número de parcelas pagas é obrigatório.')
      .min(0, 'Não pode ser negativo.')
      .max(yup.ref('installmentsTotal'), 'Não pode ser maior que o total de parcelas.')
      .integer()
      .typeError('Deve ser um número.'),
    otherwise: schema => schema.nullable(),
  }),
});

/** Values emitted by PurchaseForm; the page converts them to the API payload. */
export type PurchaseFormValues = {
  id?: string;
  creditCardId: string;
  tenantId: string;
  description: string;
  totalAmount: number | string;
  purchaseDate: string;
  isInstallment: boolean;
  installmentsTotal: number | null;
  installmentsPaid: number | null;
};
