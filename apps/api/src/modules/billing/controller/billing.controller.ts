import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
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
import { UpdateInvoiceStatusDto } from '../dto/update-invoice-status.dto';
import { BillingService } from '../service/billing.service';

@Controller('billing')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('products')
  @RequirePermission('billing:products:view')
  async listProducts(@Query() query: BillingProductQueryDto) {
    return ok(await this.billingService.listProducts(query));
  }

  @Post('products')
  @RequirePermission('billing:products:manage')
  async createProduct(@Body() payload: CreateBillingProductDto) {
    return ok(await this.billingService.createProduct(payload));
  }

  @Get('contracts')
  @RequirePermission('billing:contracts:view')
  async listContracts(@Query() query: ContractQueryDto) {
    return ok(await this.billingService.listContracts(query));
  }

  @Get('contracts/:contractId')
  @RequirePermission('billing:contracts:view')
  async getContract(@Param('contractId') contractId: string) {
    return ok(await this.billingService.getContract(contractId));
  }

  @Post('contracts')
  @RequirePermission('billing:contracts:manage')
  async createContract(@Body() payload: CreateContractDto) {
    return ok(await this.billingService.createContract(payload));
  }

  @Get('invoices')
  @RequirePermission('billing:invoices:view')
  async listInvoices(@Query() query: InvoiceQueryDto) {
    return ok(await this.billingService.listInvoices(query));
  }

  @Post('invoices')
  @RequirePermission('billing:contracts:manage')
  async createInvoice(@Body() payload: CreateInvoiceDto) {
    return ok(await this.billingService.createInvoice(payload));
  }

  @Post('invoices/:invoiceId/payments')
  @RequirePermission('billing:payments:manage')
  async createPayment(
    @Param('invoiceId') invoiceId: string,
    @Body() payload: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return ok(await this.billingService.createPayment(invoiceId, payload, idempotencyKey));
  }

  @Patch('invoices/:invoiceId/status')
  @RequirePermission('billing:invoices:manage')
  async updateInvoiceStatus(@Param('invoiceId') invoiceId: string, @Body() payload: UpdateInvoiceStatusDto) {
    return ok(await this.billingService.updateInvoiceStatus(invoiceId, payload));
  }

  @Get('payments/:paymentId')
  @RequirePermission('billing:invoices:view')
  async getPayment(@Param('paymentId') paymentId: string) {
    return ok(await this.billingService.getPayment(paymentId));
  }

  @Post('payments/:paymentId/refunds')
  @RequirePermission('billing:refunds:manage')
  async createRefund(@Param('paymentId') paymentId: string, @Body() payload: CreateRefundDto) {
    return ok(await this.billingService.createRefund(paymentId, payload));
  }

  @Get('refunds/:refundId')
  @RequirePermission('billing:invoices:view')
  async getRefund(@Param('refundId') refundId: string) {
    return ok(await this.billingService.getRefund(refundId));
  }

  @Get('renewals')
  @RequirePermission('billing:renewals:view')
  async listRenewals(@Query() query: RenewalQueryDto) {
    return ok(await this.billingService.listRenewals(query));
  }

  @Post('renewals')
  @RequirePermission('billing:renewals:manage')
  async createRenewal(@Body() payload: CreateRenewalDto) {
    return ok(await this.billingService.createRenewal(payload));
  }

  @Patch('renewals/:renewalId/status')
  @RequirePermission('billing:renewals:manage')
  async updateRenewalStatus(@Param('renewalId') renewalId: string, @Body() payload: UpdateRenewalStatusDto) {
    return ok(await this.billingService.updateRenewalStatus(renewalId, payload));
  }

  @Patch('renewals/:renewalId/follow-up')
  @RequirePermission('billing:renewals:manage')
  async updateRenewalFollowUp(@Param('renewalId') renewalId: string, @Body() payload: UpdateRenewalFollowUpDto) {
    return ok(await this.billingService.updateRenewalFollowUp(renewalId, payload));
  }
}
