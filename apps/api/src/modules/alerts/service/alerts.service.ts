import { Injectable } from '@nestjs/common';
import type { PageResult } from '../../../common/api-response';
import { normalizePage } from '../../../common/base-list-query.dto';
import { AlertQueryDto } from '../dto/alert-query.dto';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { UpdateAlertDto } from '../dto/update-alert.dto';
import { AlertsRepository } from '../repository/alerts.repository';
import type { Alert } from '@growthpilot/schema/index';

@Injectable()
export class AlertsService {
  constructor(private readonly alertsRepository: AlertsRepository) {}

  async list(query: AlertQueryDto): Promise<PageResult<Alert>> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = (await this.alertsRepository.listAlerts()).filter((item) => {
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.familyId && item.familyId !== query.familyId) return false;
      if (query.invoiceId && item.invoiceId !== query.invoiceId) return false;
      if (query.alertType && item.alertType !== query.alertType) return false;
      if (query.alertLevel && item.alertLevel !== query.alertLevel) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.dateFrom && (item.createdAt.slice(0, 10) < query.dateFrom)) return false;
      if (query.dateTo && (item.createdAt.slice(0, 10) > query.dateTo)) return false;
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        const haystack = [item.title, item.content, item.alertType, item.alertLevel, item.resolverUserId].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(keyword);
      }
      return true;
    });

    const sorted = [...filtered].sort((left, right) => {
      const leftTime = left.createdAt;
      const rightTime = right.createdAt;
      return query.sortOrder === 'asc' ? leftTime.localeCompare(rightTime) : rightTime.localeCompare(leftTime);
    });

    const start = (pageNo - 1) * pageSize;
    return { list: sorted.slice(start, start + pageSize), page: { pageNo, pageSize, total: sorted.length } };
  }

  create(payload: CreateAlertDto) {
    return this.alertsRepository.createAlert({
      alertType: payload.alertType,
      alertLevel: (payload.alertLevel as any) ?? 'medium',
      title: payload.title,
      content: payload.content,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      studentId: payload.studentId,
      familyId: payload.familyId,
      invoiceId: payload.invoiceId,
      resolverUserId: payload.resolverUserId,
      resolvedAt: payload.resolvedAt,
      status: (payload.status as any) ?? 'open',
    });
  }

  update(alertId: string, payload: UpdateAlertDto) {
    return this.alertsRepository.updateAlert(alertId, {
      status: payload.status,
      resolverUserId: payload.resolverUserId,
      resolvedAt: payload.resolvedAt,
      content: payload.content,
    });
  }
}
