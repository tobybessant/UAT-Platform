import { injectable } from "tsyringe";
import { RepositoryService } from "../services/repositoryService";
import { Repository } from "typeorm";
import { StepDbo } from "../database/entities/stepDbo";
import { CaseRepository } from "./caseRepository";
import { StepStatusDbo, StepStatus } from "../database/entities/stepStatusDbo";

@injectable()
export default class StepRepository {
  private baseStepRepository: Repository<StepDbo>;
  private baseStepStatusRepository: Repository<StepStatusDbo>;

  constructor(private respositoryService: RepositoryService, private caseRepository: CaseRepository) {
    this.baseStepRepository = respositoryService.getRepositoryFor(StepDbo);
    this.baseStepStatusRepository = respositoryService.getRepositoryFor(StepStatusDbo);
  }

  public async getStepById(id: string): Promise<StepDbo | undefined> {
    const step = await this.baseStepRepository.findOne({ id: Number(id) });
    return step;
  }

  public async addStepForCase(description: string, caseId: string): Promise<StepDbo> {
    const testCase = await this.caseRepository.getCaseById(caseId);
    const defaultStatus = await this.baseStepStatusRepository.findOne({ label: StepStatus.NOT_STARTED });

    return this.baseStepRepository.save({
      description,
      case: testCase,
      status: defaultStatus
    });
  }

  public async getStepsForCase(id: string): Promise<StepDbo[]> {
    return this.baseStepRepository
      .createQueryBuilder("step")
      .leftJoin("step.case", "case")
      .leftJoinAndSelect("step.status", "status")
      .where("case.id = :id", { id })
      .getMany();
  }

  public async updateStep(step: StepDbo): Promise<StepDbo> {
    return this.baseStepRepository.save(step);
  }
}