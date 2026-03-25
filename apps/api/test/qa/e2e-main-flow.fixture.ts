import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { AuthService } from '../../src/modules/auth/service/auth.service';
import { AttendanceRepository } from '../../src/modules/attendance/repository/attendance.repository';
import { AttendanceService } from '../../src/modules/attendance/service/attendance.service';
import { BillingRepository } from '../../src/modules/billing/repository/billing.repository';
import { BillingService } from '../../src/modules/billing/service/billing.service';
import { FamiliesRepository } from '../../src/modules/families/repository/families.repository';
import { FamiliesService } from '../../src/modules/families/families.service';
import { MockObjectStorageAdapter } from '../../src/modules/files/adapter/mock-object-storage.adapter';
import { FileAssetRepository } from '../../src/modules/files/repository/file-asset.repository';
import { FilesService } from '../../src/modules/files/service/files.service';
import { GrowthRepository } from '../../src/modules/growth/repository/growth.repository';
import { ReportDraftJob } from '../../src/modules/growth/job/report-draft.job';
import { ReportMaterialAssembler } from '../../src/modules/growth/job/report-material-assembler';
import { GrowthService } from '../../src/modules/growth/service/growth.service';
import { MockHomeworkAnalysisAdapter } from '../../src/modules/homework/adapter/mock-homework-analysis.adapter';
import { HomeworkEventPublisher } from '../../src/modules/homework/event/homework-event.publisher';
import { HomeworkAnalysisQueue } from '../../src/modules/homework/job/homework-analysis.queue';
import { HomeworkRepository } from '../../src/modules/homework/repository/homework.repository';
import { HomeworkService } from '../../src/modules/homework/service/homework.service';
import { JobsRepository } from '../../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../../src/modules/jobs/service/jobs.service';
import { MasterDataStore } from '../../src/modules/master-data/master-data.store';
import { StudentsRepository } from '../../src/modules/students/repository/students.repository';
import { StudentsService } from '../../src/modules/students/students.service';
import { TeachersRepository } from '../../src/modules/teachers/repository/teachers.repository';
import { TeachersService } from '../../src/modules/teachers/teachers.service';
import { UsersRepository } from '../../src/modules/users/repository/users.repository';
import { UsersService } from '../../src/modules/users/service/users.service';

const dataDir = resolve(process.cwd(), '.data');

function resetDataDir() {
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
}

export function createQaFixture() {
  resetDataDir();

  const usersRepository = new UsersRepository();
  const usersService = new UsersService(usersRepository);
  const authService = new AuthService(usersService);

  const fileAssetRepository = new FileAssetRepository();
  const filesService = new FilesService(fileAssetRepository, new MockObjectStorageAdapter());

  const jobsRepository = new JobsRepository();
  const jobsService = new JobsService(jobsRepository);

  const homeworkRepository = new HomeworkRepository();
  const homeworkEventPublisher = new HomeworkEventPublisher(homeworkRepository);
  const homeworkAnalysisQueue = new HomeworkAnalysisQueue(
    jobsService,
    homeworkRepository,
    filesService,
    new MockHomeworkAnalysisAdapter(),
  );
  const homeworkService = new HomeworkService(
    homeworkRepository,
    homeworkAnalysisQueue,
    homeworkEventPublisher,
    filesService,
  );

  const growthRepository = new GrowthRepository();
  const reportMaterialAssembler = new ReportMaterialAssembler(growthRepository);
  const reportDraftJob = new ReportDraftJob(growthRepository, reportMaterialAssembler, jobsService);
  const growthService = new GrowthService(growthRepository, reportDraftJob);

  process.env.GROWTHPILOT_MASTER_DATA_PATH = resolve(dataDir, 'master-data.json');
  const masterDataStore = new MasterDataStore();
  masterDataStore.reset();
  const familiesRepository = new FamiliesRepository(masterDataStore);
  const studentsRepository = new StudentsRepository(masterDataStore);
  const teachersRepository = new TeachersRepository(masterDataStore);
  const familiesService = new FamiliesService(familiesRepository);
  const studentsService = new StudentsService(studentsRepository, familiesRepository, homeworkRepository, growthRepository, new AttendanceRepository(), new BillingRepository(), jobsService);
  const teachersService = new TeachersService(teachersRepository);
  const attendanceService = new AttendanceService(new AttendanceRepository());
  const billingService = new BillingService(new BillingRepository());

  return {
    authService,
    usersService,
    filesService,
    jobsService,
    homeworkService,
    homeworkRepository,
    homeworkEventPublisher,
    growthService,
    growthRepository,
    studentsService,
    familiesService,
    teachersService,
    attendanceService,
    billingService,
  };
}
