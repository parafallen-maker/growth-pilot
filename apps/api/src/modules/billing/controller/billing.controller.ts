import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ok } from '../../../common/api-response';
import { BillingProductQueryDto } from '../dto/billing-product-query.dto';
import { ContractQueryDto } from '../dto/contract-query.dto';
import { CreateBillingProductDto } from '../dto/create-billing-product.dto';
import { CreateContractDto } from '../dto/create-contract.dto';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { CreateRenewalDto } from '../dto/create-renewal.dto';
import { InvoiceQueryDto } from '../dto/invoice-query.dto';
import { RenewalQueryDto } from '../dto/renewal-query.dto';
import { UpdateRenewalFollowUpDto } from '../dto/update-renewal-follow-up.dto';
import { UpdateRenewalStatusDto } from '../dto/update-renewal-status.dto';
import { BillingService } from '../service/billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('products')
  listProducts(@Query() query: BillingProductQueryDto) {
    return ok(this.billingService.listProducts(query));
  }

  @Post('products')
  createProduct(@Body() payload: CreateBillingProductDto) {
    return ok(this.billingService.createProduct(payload));
  }

  @Get('contracts')
  listContracts(@Query() query: ContractQueryDto) {
    return ok(this.billingService.listContracts(query));
  }

  @Get('contracts/:contractId')
  getContract(@Param('contractId') contractId: string) {
    return ok(this.billingService.getContract(contractId));
  }

  @Post('contracts')
  createContract(@Body() payload: CreateContractDto) {
    return ok(this.billingService.createContract(payload));
  }

  @Get('invoices')
  listInvoices(@Query() query: InvoiceQueryDto) {
    return ok(this.billingService.listInvoices(query));
  }

  @Post('invoices')
  createInvoice(@Body() payload: CreateInvoiceDto) {
    return ok(this.billingService.createInvoice(payload));
  }

  @Post('invoices/:invoiceId/payments')
  createPayment(
    @Param('invoiceId') invoiceId: string,
    @Body() payload: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return ok(this.billingService.createPayment(invoiceId, payload, idempotencyKey));
  }

  @Get('payments/:paymentId')
  getPayment(@Param('paymentId') paymentId: string) {
    return ok(this.billingService.getPayment(paymentId));
  }

  @Post('payments/:paymentId/refunds')
  createRefund(@Param('paymentId') paymentId: string, @Body() payload: CreateRefundDto) {
    return ok(this.billingService.createRefund(paymentId, payload));
  }

  @Get('refunds/:refundId')
  getRefund(@Param('refundId') refundId: string) {
    return ok(this.billingService.getRefund(refundId));
  }

  @Get('renewals')
  listRenewals(@Query() query: RenewalQueryDto) {
    return ok(this.billingService.listRenewals(query));
  }

  @Post('renewals')
  createRenewal(@Body() payload: CreateRenewalDto) {
    return ok(this.billingService.createRenewal(payload));
  }

  @Patch('renewals/:renewalId/status')
  updateRenewalStatus(@Param('renewalId') renewalId: string, @Body() payload: UpdateRenewalStatusDto) {
    return ok(this.billingService.updateRenewalStatus(renewalId, payload));
  }

  @Patch('renewals/:renewalId/follow-up')
  updateRenewalFollowUp(@Param('renewalId') renewalId: string, @Body() payload: UpdateRenewalFollowUpDto) {
    return ok(this.billingService.updateRenewalFollowUp(renewalId, payload));
  }
}
