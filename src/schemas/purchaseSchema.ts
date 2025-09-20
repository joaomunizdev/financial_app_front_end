import * as yup from 'yup';

export const purchaseSchema = yup.object({
  creditCardId: yup.string().required('O cartão é obrigatório.'),
  tenantId: yup.string().required('O responsável é obrigatório.'),
  description: yup.string().required('A descrição é obrigatória.'),
  
  totalAmount: yup.number()
    .transform(value => (isNaN(value) ? undefined : value))
    .required('O valor é obrigatório.')
    .positive('O valor deve ser positivo.')
    .typeError('O valor deve ser um número.'),

  purchaseDate: yup.date()
    .required('A data é obrigatória.')
    .typeError('Formato de data inválido.'),

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