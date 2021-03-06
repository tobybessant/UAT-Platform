import { TypeORMRepository } from "./baseRepository.abstract";
import { StepFeedbackDbo } from "../database/entities/stepFeedbackDbo";
import { StepStatusDbo, StepStatus } from "../database/entities/stepStatusDbo";
import { RepositoryService } from "../services/repositoryService";
import { injectable } from "tsyringe";
import { StepDbo } from "../database/entities/stepDbo";
import { UserDbo } from "../database/entities/userDbo";
import { UserRepository } from "./userRepository";

@injectable()
export class StepFeedbackRepository extends TypeORMRepository<StepFeedbackDbo> {
  private baseStepStatusRepository: any;
  constructor(private repositoryService: RepositoryService, private userRepository: UserRepository) {
    super(StepFeedbackDbo, repositoryService);
    this.baseStepStatusRepository = repositoryService.getRepositoryFor(StepStatusDbo);
  }

  public async addStepFeedback(user: UserDbo, step: StepDbo, notes: string, statusLabel: string): Promise<StepFeedbackDbo> {
    const status = await this.baseStepStatusRepository
      .createQueryBuilder("status")
      .where("status.label = :label", { label: statusLabel })
      .getOne();

    return this.getBaseRepo().save({ notes, user, step, status });
  }

  public async getAllUserFeedbackForStep(stepId: string): Promise<UserDbo[]> {
    const feedbackQuery = await this.userRepository.getBaseRepo()
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.stepFeedback", "feedback")
      .leftJoinAndSelect("feedback.status", "status")
      .leftJoin("feedback.step", "step")
      .where("step.id = :sid", { sid: stepId })
      .orderBy("feedback.createdDate", "DESC");

    return feedbackQuery.getMany();
  }

  public async getUserFeedbackForStep(stepId: string, userEmail: string): Promise<StepFeedbackDbo[]> {
    const feedbackQuery = await this.getBaseRepo()
      .createQueryBuilder("feedback")
      .leftJoinAndSelect("feedback.user", "user")
      .leftJoinAndSelect("feedback.status", "status")
      .leftJoin("feedback.step", "step")
      .where("step.id = :id", { id: stepId })
      .andWhere("user.email = :email", { email: userEmail })
      .orderBy("feedback.createdDate", "DESC");

    return feedbackQuery.getMany();
  }

  public async getFeedbackForProject(projectId: string): Promise<UserDbo[]> {
    const feedbackQuery = await this.userRepository.getBaseRepo()
    .createQueryBuilder("user")
    .leftJoinAndSelect("user.stepFeedback", "feedback")
    .leftJoinAndSelect("feedback.status", "status")
    .leftJoinAndSelect("feedback.step", "step")
    .leftJoin("user.userType", "type")
    .leftJoin("user.projects", "projects")
    .leftJoin("projects.project", "project")
    .where("project.id = :id", { id: projectId })
    .andWhere("type.type = :label", { label: "Client" })
    .orderBy("user.createdDate", "ASC")
    .addOrderBy("feedback.createdDate", "DESC");

    return feedbackQuery.getMany();
  }
}