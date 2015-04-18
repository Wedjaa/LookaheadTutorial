import {ESClient} from 'modules/es-client';
import {Router} from 'aurelia-router';
import {Redirect} from 'aurelia-router';
import {Parent} from 'aurelia-framework';


export class TypeaheadTester {

    static inject = [ESClient, Parent.of(Router)];

    // Keep the state during navigation
    static metadata(){ return Metadata.singleton(true); };

    esUrl;
    queryTpl;
    showResponse = false;

    constructor(esClient, router) {
        this.esClient = esClient;
        this.parentRouter = router;
    }

    toggleResponse() {
        this.showResponse = !this.showResponse;
    }
    canActivate() {

        var self = this;

        if ( typeof this.parentRouter.options.es === 'undefined') {
            console.log("Redirecting to load");
            this.parentRouter.options.message = "Check ES Server parameters first.";
            return new Redirect('/load');
        }

        this.esClient.setConnection(this.parentRouter.options.es.server, this.parentRouter.options.es.port);

        return this.esClient.hasIndex('lookahead')
            .then(indexExists => {
                if (indexExists ) {
                    self.esUrl = self.esClient.getUrl() + "lookahead" + "/_search";
                    self.queryTpl = '{"query":{"filtered":{"query":{"bool":{"must":[{"match_all":{}}],"should":[{"term":{"title_default":{"value":"{{token}}","boost":2}}}]}},"filter":{"term":{"title_edge":"{{token}}"}}}},"size":100,"fields":["dcterms:title"]}';
                    return true;
                }
                this.parentRouter.options.message = "Load sample data first.";
                return new Redirect('/load');
            })
    }
}