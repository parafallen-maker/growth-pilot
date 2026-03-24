export const attendancePermissions = {
  boardView: 'attendance:board:view',
  boardManage: 'attendance:board:manage',
  devicesView: 'attendance:devices:view',
  devicesManage: 'attendance:devices:manage',
  homeworkTimeView: 'attendance:homework-time:view',
  homeworkTimeManage: 'attendance:homework-time:manage',
} as const;

export const attendanceStates = {
  online: 'online',
  offline: 'offline',
  abnormal: 'abnormal',
} as const;
