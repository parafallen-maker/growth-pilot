import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { BillingContract, BillingInvoice, BillingPayment, BillingProduct, BillingRefund } from '@growthpilot/schema/index';
import { normalizePage } from '../../../common/base-list-query.dto';
import type { PageResult } from '../../../common/api-response';
import { BillingProductQueryDto } from '../dto/billing-product-query.dto';
import { ContractQueryDto } from '../dto/contract-query.dto';
import { CreateBillingProductDto } from '../dto/create-billing-product.dto';
import { CreateContractDto } from '../dto/create-contract.dto';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { InvoiceQueryDto } from '../dto/invoice-query.dto';
import { BillingRepository } from '../repository/billing.repository';

@Injectable()
export class BillingService {
  constructor(private readonly billingRepository: BillingRepository) {}

  listProducts(query: BillingProductQueryDto): PageResult<BillingProduct> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.billingRepository.listProducts().filter((item) => {
      if (query.category && item.category !== query.category) return false;
      if (query.status && item.status !== query.status) return false;
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  createProduct(payload: CreateBillingProductDto) {
    if (payload.priceCents < 0) throw new ConflictException('priceCents must be >= 0');
    return this.billingRepository.createProduct({
      code: payload.code,
      name: payload.name,
      category: payload.category,
      billingMode: payload.billingMode,
      priceCents: payload.priceCents,
      unit: payload.unit ?? 'term',
      description: payload.description,
      status: payload.status ?? 'active',
    });
  }

  listContracts(query: ContractQueryDto): PageResult<BillingContract> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.billingRepository.listContracts().filter((item) => {
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        return [item.contractNo, item.familyId, item.studentId, item.remark].filter(Boolean).some((value) => value!.toLowerCase().includes(keyword));
      }
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  getContract(contractId: string) {
    const contract = this.billingRepository.getContractOrThrow(contractId);
    return {
      contract,
      items: this.billingRepository.listContractItems(contractId),
      invoices: this.billingRepository.listInvoices().filter((item) => item.contractId === contractId),
    };
  }

  createContract(payload: CreateContractDto) {
    if (payload.endDate < payload.startDate) {
      throw new ConflictException('endDate must be >= startDate');
    }
    if (!payload.items?.length) {
      throw new ConflictException('items is required');
    }

    return this.billingRepository.runInTransaction(() => {
      const items = payload.items.map((item) => {
        const quantity = Number(item.quantity ?? 0);
        const unitPriceCents = Number(item.unitPriceCents ?? 0);
        if (quantity < 0 || unitPriceCents < 0) throw new ConflictException('contract item amount must be >= 0');
        return {
          productId: item.productId,
          itemName: item.itemName,
          unitPriceCents,
          quantity,
          subtotalCents: Math.round(unitPriceCents * quantity),
        };
      });
      const totalAmountCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
      const discountAmountCents = payload.discountAmountCents ?? 0;
      const payableAmountCents = Math.max(totalAmountCents - discountAmountCents, 0);
      const created = this.billingRepository.createContract(
        {
          contractNo: payload.contractNo,
          campusId: payload.campusId ?? null,
          termId: payload.termId ?? null,
          familyId: payload.familyId,
          studentId: payload.studentId,
          signDate: payload.signDate,
          startDate: payload.startDate,
          endDate: payload.endDate,
          totalAmountCents,
          discountAmountCents,
          payableAmountCents,
          status: payload.status ?? 'active',
          remark: payload.remark,
        },
        items,
      );
      return {
        id: created.contract.id,
        contractNo: created.contract.contractNo,
      };
    });
  }

  listInvoices(query: InvoiceQueryDto): PageResult<BillingInvoice> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.billingRepository.listInvoices().filter((item) => {
      if (query.status && item.status !== query.status) return false;
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        return [item.invoiceNo, item.familyId, item.studentId, item.note].filter(Boolean).some((value) => value!.toLowerCase().includes(keyword));
      }
      if (query.dateFrom && item.issueDate < query.dateFrom) return false;
      if (query.dateTo && item.issueDate > query.dateTo) return false;
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  createInvoice(payload: CreateInvoiceDto) {
    return this.billingRepository.runInTransaction(() => {
      if (payload.amountCents < 0) throw new ConflictException('amountCents must be >= 0');
      const items = (payload.items ?? []).map((item) => ({
        itemName: item.itemName,
        productId: item.productId,
        quantity: item.quantity ?? 1,
        unitPriceCents: item.unitPriceCents ?? item.amountCents,
        amountCents: item.amountCents,
        remark: item.remark,
      }));
      const created = this.billingRepository.createInvoice(
        {
          invoiceNo: payload.invoiceNo,
          contractId: payload.contractId ?? null,
          familyId: payload.familyId,
          studentId: payload.studentId,
          billingPeriod: payload.billingPeriod,
          issueDate: payload.issueDate,
          dueDate: payload.dueDate,
          amountCents: payload.amountCents,
          status: payload.status ?? 'draft',
          note: payload.note,
        },
        items,
      );
      return {
        id: created.invoice.id,
        invoiceNo: created.invoice.invoiceNo,
      };
    });
  }

  createPayment(invoiceId: string, payload: CreatePaymentDto, idempotencyKey?: string) {
    return this.billingRepository.runInTransaction(() => {
      const invoice = this.billingRepository.getInvoiceOrThrow(invoiceId);
      const existingByKey = idempotencyKey ? this.billingRepository.findPaymentByIdempotencyKey(idempotencyKey) : undefined;
      if (existingByKey) {
        return { paymentId: existingByKey.id, status: existingByKey.status, replayed: true };
      }

      const paidAmountCents = Number(payload.paidAmountCents);
      if (paidAmountCents < 0) throw new ConflictException('paidAmountCents must be >= 0');
      const settledCents = this.computeSuccessfulPayments(invoiceId) - this.computeSuccessfulRefundsByInvoice(invoiceId);
      if (settledCents + paidAmountCents > invoice.amountCents) {
        throw new ConflictException({ code: 'FLOW_409', message: 'payment exceeds invoice receivable' });
      }

      const payment = this.billingRepository.createPayment({
        invoiceId,
        paymentNo: payload.paymentNo,
        paidAmountCents,
        paymentTime: payload.paymentTime,
        channel: payload.channel,
        transactionNo: payload.transactionNo,
        status: payload.status ?? 'success',
        idempotencyKey: idempotencyKey ?? null,
        remark: payload.remark,
      });

      this.refreshInvoiceStatus(invoice.id);
      return { paymentId: payment.id, status: payment.status };
    });
  }

  getPayment(paymentId: string) {
    const payment = this.billingRepository.getPaymentOrThrow(paymentId);
    return {
      payment,
      invoice: this.billingRepository.getInvoiceOrThrow(payment.invoiceId),
      refunds: this.billingRepository.listRefundsByPayment(paymentId),
    };
  }

  createRefund(paymentId: string, payload: CreateRefundDto) {
    return this.billingRepository.runInTransaction(() => {
      const payment = this.billingRepository.getPaymentOrThrow(paymentId);
      const refundedCents = this.billingRepository
        .listRefundsByPayment(paymentId)
        .filter((item) => item.status === 'success')
        .reduce((sum, item) => sum + item.refundAmountCents, 0);
      if (refundedCents + payload.refundAmountCents > payment.paidAmountCents) {
        throw new ConflictException({ code: 'FLOW_409', message: 'refund exceeds payment amount' });
      }

      const refund = this.billingRepository.createRefund({
        paymentId,
        refundNo: payload.refundNo,
        refundAmountCents: payload.refundAmountCents,
        refundTime: payload.refundTime,
        reason: payload.reason,
        status: payload.status ?? 'success',
      });
      this.refreshInvoiceStatus(payment.invoiceId);
      return { refundId: refund.id, status: refund.status };
    });
  }

  getRefund(refundId: string) {
    const refund = this.billingRepository.getRefundOrThrow(refundId);
    const payment = refund.paymentId ? this.billingRepository.getPaymentOrThrow(refund.paymentId) : null;
    return {
      refund,
      payment,
      invoice: payment ? this.billingRepository.getInvoiceOrThrow(payment.invoiceId) : null,
    };
  }

  private refreshInvoiceStatus(invoiceId: string) {
    const invoice = this.billingRepository.getInvoiceOrThrow(invoiceId);
    const netReceived = this.computeSuccessfulPayments(invoiceId) - this.computeSuccessfulRefundsByInvoice(invoiceId);
    let status = invoice.status;
    if (netReceived <= 0) {
      status = invoice.status === 'canceled' ? 'canceled' : 'issued';
    } else if (netReceived < invoice.amountCents) {
      status = 'partial';
    } else {
      status = 'paid';
    }
    this.billingRepository.updateInvoice(invoiceId, { status });
  }

  private computeSuccessfulPayments(invoiceId: string) {
    return this.billingRepository
      .listPaymentsByInvoice(invoiceId)
      .filter((item) => item.status === 'success')
      .reduce((sum, item) => sum + item.paidAmountCents, 0);
  }

  private computeSuccessfulRefundsByInvoice(invoiceId: string) {
    return this.billingRepository
      .listPaymentsByInvoice(invoiceId)
      .flatMap((payment) => this.billingRepository.listRefundsByPayment(payment.id))
      .filter((item) => item.status === 'success')
      .reduce((sum, item) => sum + item.refundAmountCents, 0);
  }

  private page<T>(list: T[], pageNo: number, pageSize: number): PageResult<T> {
    const start = (pageNo - 1) * pageSize;
    return { list: list.slice(start, start + pageSize), page: { pageNo, pageSize, total: list.length } };
  }
}
