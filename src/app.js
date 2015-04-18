import {inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import 'bootstrap';
import 'bootstrap/css/bootstrap.css!';

@inject(Router)
export class App {
  constructor(router) {
    this.router = router;
    this.router.configure(config => {
      config.title = 'LookAhead';
      config.map([
        { route: ['','load'], moduleId: './load', nav: true, title: "Load Data" },
        { route: 'analyze', moduleId: './analyze', nav: true, title: "Analyzers" },
        { route: 'search', moduleId: './search', nav: true, title: "Search Tests" },
        { route: 'lookahead', moduleId: './lookahead', nav: true, title: "LookAhead Tests" }
      ]);
    });
  }
}
