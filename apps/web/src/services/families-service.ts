import type { PageResult, QueryBase } from '@/features/shared/types';

type FamilyItem = { id: string; name: string; contact: string; phone: string; students: string; balance: string; lastContact: string; status: string };

const families: FamilyItem[] = [
  { id: 'F-301', name: '张家', contact: '张女士', phone: '138****1290', students: '2', balance: '¥0', lastContact: '今天 16:20', status: '正常' },
  { id: 'F-314', name: '林家', contact: '林先生', phone: '139****2381', students: '1', balance: '¥1,280', lastContact: '昨天 18:05', status: '待续费' },
];

export const familyService = {
  query(params: QueryBase = {}): PageResult<FamilyItem> {
    return { list: families, page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: families.length } };
  },
  detail(id: string) {
    return {
      id,
      guardians: [
        { name: '张女士', detail: '母亲 / 微信已绑定 / 接送联系人' },
        { name: '张先生', detail: '父亲 / 账单默认接收人' },
      ],
      students: [
        { name: '张小北', detail: '三年级 / 在读 / 周老师' },
        { name: '张小南', detail: '一年级 / 在读 / 李老师' },
      ],
      timeline: [
        { title: '续费提醒', detail: '合同将于 2026-04-12 到期。' },
        { title: '家庭任务', detail: '阅读打卡 7 天 / 家校沟通待回执。' },
      ],
    };
  },
};
