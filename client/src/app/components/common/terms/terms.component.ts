import { Component, OnInit } from "@angular/core";
import { environment } from "../../../../environments/environment";

@Component({
  selector: "app-terms",
  templateUrl: "./terms.component.html",
  styleUrls: ["./terms.component.scss"]
})
export class TermsComponent implements OnInit {

  public licensesUrl = environment.apiRootUrl + "/licenses";

  constructor() { }

  ngOnInit(): void {
  }

}
