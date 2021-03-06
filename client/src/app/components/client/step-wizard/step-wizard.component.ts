import { Component, OnInit } from "@angular/core";
import { NavbarService } from "src/app/services/navbar/navbar.service";
import { Router, ActivatedRoute, ActivatedRouteSnapshot } from "@angular/router";
import { BasicNavButtonComponent } from "../../common/nav/basic-nav-button/basic-nav-button.component";
import { StepApiService } from "src/app/services/api/step/step-api.service";
import { IStepResponse } from "src/app/models/api/response/client/step.interface";
import { StepFeedbackApiService } from "src/app/services/api/stepFeedback/step-feedback-api.service";
import { SessionService } from "src/app/services/session/session.service";
import { IStepFeedbackResponse } from "src/app/models/api/response/client/stepFeedback.interface";
import { IStepStatusResponse } from "src/app/models/api/response/supplier/step-status.interface";
import { NbDialogService } from "@nebular/theme";
import { FinishCaseDialogComponent } from "../finish-case-dialog/finish-case-dialog.component";
import { CaseApiService } from "src/app/services/api/case/case-api.service";
import { ICaseResponse } from "src/app/models/api/response/client/case.interface";

@Component({
  selector: "app-step-wizard",
  templateUrl: "./step-wizard.component.html",
  styleUrls: ["./step-wizard.component.scss"]
})
export class StepWizardComponent implements OnInit {

  private caseData: ICaseResponse;
  public steps: IStepResponse[] = [];
  private feedback: Map<string, IStepFeedbackResponse>;

  public activeStepIndex: number = 0;

  public activeStepFeedbackNotes: string = "";
  public activeStepFeedbackStatus: string = "Not Started";

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navbarService: NavbarService,
    private stepApiService: StepApiService,
    private caseApiService: CaseApiService,
    private stepFeedbackApiService: StepFeedbackApiService,
    private sessionService: SessionService,
    private dialogService: NbDialogService
  ) { }

  async ngOnInit(): Promise<void> {
    this.navbarService.setHeader("");
    this.navbarService.setActiveButton({
      component: BasicNavButtonComponent,
      data: {
        label: "Back to Project",
        callback: () => {
          const url = this.getResolvedUrl(this.route.snapshot);
          this.router.navigate([url]);
        }
      }
    });

    this.feedback = new Map<string, IStepFeedbackResponse>();

    this.route.paramMap.subscribe(async p => await this.fetchSteps(p.get("caseId")));
  }

  private getResolvedUrl(route: ActivatedRouteSnapshot): string {
    const routes = route.pathFromRoot.filter(r => r.url.length > 0);
    const paths = routes.map(p => p.url);

    if (paths[0]?.length >= 2) {
      const segs = paths[0];
      return segs[0] + "/" + segs[1];
    }
  }

  private async fetchSteps(caseId: string): Promise<void> {
    const caseResponse = await this.caseApiService.getCaseById<ICaseResponse>(caseId);
    this.caseData = caseResponse.payload;
    this.steps = this.caseData.steps;

    for (const step of this.steps) {
      const feedbackForStep = await this.stepFeedbackApiService
        .getLatestStepFeedbackFromUser(step.id, this.sessionService.getCurrentUser().email);

      if (feedbackForStep.payload) {
        this.feedback.set(step.id, feedbackForStep.payload);
      }
    }

    this.loadStepData();
  }

  public async nextStep(idx?: number): Promise<void> {
    if (idx !== undefined && idx < this.steps.length && idx + 1 > 0) {
      this.activeStepIndex = idx;
      this.activeStepFeedbackNotes = "";
      this.activeStepFeedbackStatus = "";
      await this.loadStepData();
      return;
    }

    if (this.activeStepIndex < this.steps.length - 1) {
      this.activeStepIndex++;
      this.activeStepFeedbackNotes = "";
      this.activeStepFeedbackStatus = "";
      await this.loadStepData();
    }
  }

  public prevStep(): void {
    if (this.activeStepIndex > 0) {
      this.activeStepIndex--;
      this.loadStepData();
    }
  }

  private async loadStepData(): Promise<void> {
    const stepId = this.getActiveStep().id;

    if (!this.feedback.has(stepId) || this.feedback.get(stepId) !== undefined) {
      const feedbackForStep = await this.stepFeedbackApiService
        .getLatestStepFeedbackFromUser(stepId, this.sessionService.getCurrentUser().email);

      if (feedbackForStep.payload) {
        this.feedback.set(stepId, feedbackForStep.payload);
      }
      this.loadFeedbackForStep(stepId);
    }
  }

  public getActiveStep(): IStepResponse {
    return this.steps[this.activeStepIndex];
  }

  public getActiveStepDescription(): string {
    const step = this.steps[this.activeStepIndex];
    if (step) {
      return step.description;
    }
    return "";
  }

  public getTotalSteps(): number {
    return this.steps.length;
  }

  public getCurrentStepIndex(): number {
    return this.activeStepIndex + 1;
  }

  private loadFeedbackForStep(stepId: string): void {
    const feedback = this.feedback.get(stepId);

    if (!feedback) {
      this.activeStepFeedbackNotes = "";
      this.activeStepFeedbackStatus = "Not Started";
      return;
    }

    this.activeStepFeedbackNotes = feedback.notes;
    this.activeStepFeedbackStatus = feedback.status.label;
  }

  public getFeedbackStatusForStep(stepId: string): IStepStatusResponse {
    if (this.feedback.has(stepId)) {
      return this.feedback.get(stepId).status;
    }

    return { id: "3", label: "Not Started" };
  }

  private async addStepFeedback(): Promise<void> {
    const stepId = this.getActiveStep().id;
    await this.stepFeedbackApiService.addFeedbackForStep(stepId, this.activeStepFeedbackNotes, this.activeStepFeedbackStatus);
    await this.loadStepData();
  }

  private stepFeedbackChanged(): boolean {
    const feedback = this.feedback.get(this.getActiveStep().id);
    if (!feedback) {
      return true;
    }

    const notesChanged = feedback.notes !== this.activeStepFeedbackNotes;
    const statusChanged = feedback.status.label !== this.activeStepFeedbackStatus;

    return notesChanged || statusChanged;
  }

  public isCurrentStep(step: IStepResponse): boolean {
    return this.steps.indexOf(step) === this.activeStepIndex;
  }

  public getNextButtonText(): string {
    return this.activeStepIndex + 1 === this.steps.length ? "Finish" : "Next Step";
  }

  public onLastStep(): boolean {
    return this.activeStepIndex + 1 === this.steps.length;
  }

  public async nextAction(): Promise<void> {
    if (this.stepFeedbackChanged()) {
      await this.addStepFeedback();
    }

    if (this.activeStepIndex + 1 === this.steps.length) {
      return this.openFinishDialog();
    }

    this.nextStep();
  }

  private openFinishDialog(): void {
    this.dialogService.open(FinishCaseDialogComponent, {
      context: {
        projectUrl: this.getResolvedUrl(this.route.snapshot),
        caseName: this.getCaseTitle()
      }
    });
  }

  public async failRemainingTests(): Promise<void> {
    this.addStepFeedback();
    const startIdx = this.activeStepIndex + 1;
    for (let i = startIdx; i < this.steps.length; i++) {
      const step = this.steps[i];
      await this.stepFeedbackApiService.addFeedbackForStep(step.id, this.feedback.get(step.id)?.notes || "", "Failed");
    }

    this.fetchSteps(this.caseData.id);
  }

  public allRemainingStepsFailed(): boolean {
    const nonFailedSteps = this.steps.filter((s, idx) => {
      if (idx > this.activeStepIndex) {
        const f = this.feedback.get(s.id);
        return f?.status.label !== "Failed";
      }

      return false;
    });

    return nonFailedSteps.length === 0;
  }

  public getCaseTitle(): string {
    return this.caseData?.title || "";
  }
}
