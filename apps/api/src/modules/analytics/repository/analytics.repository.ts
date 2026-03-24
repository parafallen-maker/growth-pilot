import { Injectable } from '@nestjs/common';
import { AttendanceRepository } from '../../attendance/repository/attendance.repository';
import { BillingRepository } from '../../billing/repository/billing.repository';
import { CommunicationRepository } from '../../communication/repository/communication.repository';
import { HomeworkRepository } from '../../homework/repository/homework.repository';

@Injectable()
export class AnalyticsRepository {
  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly communicationRepository: CommunicationRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly homeworkRepository: HomeworkRepository,
  ) {}

  listContracts() { return this.billingRepository.listContracts(); }
  listInvoices() { return this.billingRepository.listInvoices(); }
  listPayments() { return this.billingRepository.listPayments(); }
  listRefunds() { return this.billingRepository.listRefunds(); }
  listRenewals() { return this.billingRepository.listRenewals(); }
  listCommunicationRecords() { return this.communicationRepository.listRecords(); }
  listMessageTasks() { return this.communicationRepository.listMessageTasks(); }
  listAttendanceEvents() { return this.attendanceRepository.listEvents(); }
  listHomeworkDailyStats() { return this.attendanceRepository.listDailyStats(); }
  listHomeworkSubmissions() { return this.homeworkRepository.listSubmissions(); }
}
