export const billingPermissions = {
  productsView: 'billing:products:view',
  productsManage: 'billing:products:manage',
  contractsView: 'billing:contracts:view',
  contractsManage: 'billing:contracts:manage',
  invoicesView: 'billing:invoices:view',
  paymentsManage: 'billing:payments:manage',
  refundsManage: 'billing:refunds:manage',
  renewalsView: 'billing:renewals:view',
  renewalsManage: 'billing:renewals:manage',
} as const;

export const billingTabs = ['账单', '支付', '退款', '调整项'] as const;
