import { Component, OnInit, Input } from "@angular/core";
import { StepFeedbackApiService } from "src/app/services/api/stepFeedback/step-feedback-api.service";
import { ProjectApiService } from "src/app/services/api/project/project-api.service";

@Component({
  selector: "app-results",
  templateUrl: "./results.component.html",
  styleUrls: ["./results.component.scss"]
})
export class ResultsComponent implements OnInit {

  @Input()
  private projectId: string;

  public clients: any[] = [];
  public project: any;

  constructor(
    private feedbackApiService: StepFeedbackApiService,
    private projectsApiService: ProjectApiService
  ) { }

  async ngOnInit(): Promise<void> {
    const projectFeedbackPerUser = await this.feedbackApiService.getAllFeedbackForProject(this.projectId);
    this.clients = projectFeedbackPerUser.payload;

    this.project = (await this.projectsApiService.getProjectById(this.projectId, true)).payload;
  }

  public getClientFeedbackStatusForStep(client: any, step: any) {
    const user = this.clients.find(c => c.email === client.email);
    if (user?.feedback) {
      const feedback = user.feedback[step.id];
      // console.log(feedback);
      if (feedback) {
        return feedback.status;
      }
    }
    return { label: "Not Started" };
  }

  public collapse(evt, item: any) {
    evt.stopPropagation();
    item.collapsed = item.collapsed ? !item.collapsed : true;
  }
}
