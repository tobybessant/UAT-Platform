import { Component, OnInit, Input, ElementRef, ViewChild, OnDestroy, AfterViewInit } from "@angular/core";
import { ActiveStepService } from "src/app/services/active-step/active-step.service";
import { StepFeedbackApiService } from "src/app/services/api/stepFeedback/step-feedback-api.service";
import { SessionService } from "src/app/services/session/session.service";
import { IUserResponse } from "src/app/models/api/response/common/user.interface";
import { trigger, transition, style, animate } from "@angular/animations";
import { IStepResponse } from "src/app/models/api/response/client/step.interface";

@Component({
  selector: "app-step",
  templateUrl: "./step.component.html",
  styleUrls: ["./step.component.scss"],
  animations: [
    trigger(
      "inOutAnimation",
      [
        transition(
          ":enter",
          [
            style({ width: 0, opacity: 0 }),
            animate("0.08s ease-out",
              style({ width: 300, opacity: 1 }))
          ]
        ),
        transition(
          ":leave",
          [
            style({ width: 300, opacity: 1 }),
            animate("0.08s ease-in",
              style({ width: 0, opacity: 0 }))
          ]
        )
      ]
    )
  ]
})
export class StepComponent implements OnInit, OnDestroy {

  @ViewChild("stepPanel")
  public stepPanel: ElementRef;

  private step: IStepResponse;
  private user: IUserResponse;
  private latestFeedback: any;
  public notes: string = "";
  public status: string = "Not Started";

  constructor(
    private activeStepService: ActiveStepService,
    private sessionService: SessionService,
    private stepFeedbackApiService: StepFeedbackApiService
  ) { }


  ngOnInit(): void {
    this.user = this.sessionService.getCurrentUser();
    this.activeStepService.getStepSubject().subscribe(step => {
      this.setSelectedStep(step);
    });

    window.addEventListener("scroll", (evt) => {
      if (this.stepSelected()) {
        this.checkPosition(evt);
      }
    }, true);

    if (this.step) {
      this.setSelectedStep(this.activeStepService.getSelectedStep());
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener("scroll", (evt) => {
      if (this.stepSelected()) {
        this.checkPosition(evt);
      }
    }, true);
  }

  private async setSelectedStep(step: any) {
    this.step = step;
    if (step) {
      const feedback = await this.stepFeedbackApiService.getLatestStepFeedbackFromUser(this.step.id, this.user.email);
      console.log(feedback);
      this.latestFeedback = feedback.payload;
      this.notes = this.latestFeedback?.notes || "";
      this.status = this.step.currentStatus.label;
    }
  }

  public getStepDescription() {
    return this.step ? this.step.description : "No step selected";
  }

  public getLatestFeedbackStatus() {
    if (this.latestFeedback && JSON.stringify(this.latestFeedback) !== JSON.stringify({})) {
      return this.latestFeedback.notes;
    }
    return "Not Started";
  }

  public stepSelected(): boolean {
    return this.step !== null && this.step !== undefined;
  }

  public closeStepPanel() {
    this.activeStepService.setSelectedStep(null);
  }

  public async addFeedback() {
    await this.stepFeedbackApiService.addFeedbackForStep(this.step.id, this.notes, this.status);
    this.activeStepService.stepDetailsUpdated();
  }

  public async addFeedbackAndCloseStepPanel() {
    await this.stepFeedbackApiService.addFeedbackForStep(this.step.id, this.notes, this.status);
    await this.activeStepService.stepDetailsUpdated();
    this.closeStepPanel();
  }

  public checkPosition(evt: any) {
    console.log(this.isScrolledIntoView(this.stepPanel.nativeElement));
  }

  private isScrolledIntoView(element: any) {
    const boundary = element.getBoundingClientRect();
    const top = boundary.top;
    const bottom = boundary.bottom;

    // Only completely visible elements return true:
    const isVisible = (top >= 0) && (bottom <= window.innerHeight);
    // Partially visible elements return true:
    // isVisible = elemTop < window.innerHeight && elemBottom >= 0;
    return isVisible;
  }
}
